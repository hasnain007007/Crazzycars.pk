/**
 * Invoices list + create (standalone — not Orders).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { allocateInvoiceNumber } from "@/lib/invoiceNumber";
import Invoice from "@/lib/models/Invoice.model";
import Product from "@/lib/models/Product.model";
import { syncStockAlertForProduct } from "@/lib/productMutations";
import { upsertInvoiceCustomer } from "@/lib/upsertInvoiceCustomer";
import {
  recomputeInvoicePaymentFields,
  serializeInvoicePayments,
} from "@/lib/invoicePayments";
import { getCustomerArSummary } from "@/lib/customerAr";
import Customer from "@/lib/models/Customer.model";

const PAYMENT_METHODS = new Set([
  "cod",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
  "cash",
  "other",
]);

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function productImageFromDoc(p) {
  const imgs = p?.media?.images;
  if (Array.isArray(imgs) && imgs.length) {
    const first = imgs[0];
    return typeof first === "string" ? first : first?.url || first?.secure_url || "";
  }
  return "";
}

function unitPriceFromProduct(p) {
  const sale = Number(p?.pricing?.salePrice);
  const regular = Number(p?.pricing?.regularPrice);
  if (Number.isFinite(sale) && sale > 0) return sale;
  if (Number.isFinite(regular) && regular >= 0) return regular;
  return 0;
}

function serializeInvoice(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  recomputeInvoicePaymentFields(o);
  return {
    id: o._id.toString(),
    invoiceNumber: o.invoiceNumber,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: o.customer || {},
    customerId: o.customerId ? String(o.customerId) : null,
    billingAddress: o.billingAddress || {},
    shippingAddress: {
      name: o.customer?.name || "",
      phone: o.customer?.phone || "",
      email: o.customer?.email || "",
      street: o.billingAddress?.street || "",
      city: o.billingAddress?.city || "",
      country: o.billingAddress?.country || "Pakistan",
    },
    items: (o.items || []).map((i) => ({
      productId: i.productId ? String(i.productId) : null,
      name: i.name,
      image: i.image || "",
      variation: i.variation || "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    pricing: o.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 },
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    amountPaid: o.amountPaid || 0,
    remainingBalance: o.remainingBalance ?? (Number(o.pricing?.total) || 0),
    previousBalance: Number(o.previousBalance) || 0,
    invoiceBalance: o.remainingBalance ?? (Number(o.pricing?.total) || 0),
    totalReceivables: Math.round(
      ((Number(o.remainingBalance) || 0) + (Number(o.previousBalance) || 0)) * 100
    ) / 100,
    payments: serializeInvoicePayments(o.payments),
    currency: o.currency || "PKR",
    note: o.note || "",
    createdBy: o.createdBy || "",
    /** Alias so shared print helpers work */
    orderNumber: o.invoiceNumber,
    linkedOrderId: o.orderId ? String(o.orderId) : null,
    linkedOrderNumber: o.orderNumber || "",
  };
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const search = (searchParams.get("search") || "").trim();
    const customerId = (searchParams.get("customerId") || "").trim();

    const filter = {};
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { invoiceNumber: rx },
        { "customer.name": rx },
        { "customer.phone": rx },
        { "customer.email": rx },
      ];
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      invoices: rows.map(serializeInvoice),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load invoices." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const customerIn = body.customer && typeof body.customer === "object" ? body.customer : {};
    const name = String(customerIn.name || "").trim();
    const phone = String(customerIn.phone || "").trim();
    const email = String(customerIn.email || "").trim().toLowerCase();
    const city = String(customerIn.city || body.billingAddress?.city || "").trim();
    const street = String(customerIn.address || body.billingAddress?.street || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Customer name is required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ success: false, error: "Customer phone is required." }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length < 1) {
      return NextResponse.json({ success: false, error: "Add at least one product." }, { status: 400 });
    }

    const productIds = [
      ...new Set(
        body.items
          .map((it) => String(it?.productId || "").trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const products =
      productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).select("name media pricing inventory").lean()
        : [];
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const normalizedItems = [];
    for (const raw of body.items) {
      const productIdRaw = String(raw?.productId || "").trim();
      const product =
        productIdRaw && mongoose.Types.ObjectId.isValid(productIdRaw) ? byId.get(productIdRaw) : null;
      const nameItem = String(raw?.name || product?.name || "").trim();
      const quantity = Math.max(1, Math.min(999, Math.round(Number(raw?.quantity) || 1)));
      let unitPrice = Number(raw?.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        unitPrice = product ? unitPriceFromProduct(product) : 0;
      }
      if (!nameItem) {
        return NextResponse.json(
          { success: false, error: "Each item needs a product name." },
          { status: 400 }
        );
      }
      const unitCost = Math.max(0, Number(raw?.unitCost ?? product?.pricing?.costPerItem ?? 0) || 0);
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      normalizedItems.push({
        productId: product ? product._id : null,
        name: nameItem.slice(0, 300),
        image: String(raw?.image || (product ? productImageFromDoc(product) : "") || "")
          .trim()
          .slice(0, 1000),
        variation: String(raw?.variation || "").trim().slice(0, 200),
        quantity,
        unitPrice,
        unitCost,
        total: lineTotal,
      });
    }

    const subtotal =
      Math.round(normalizedItems.reduce((s, i) => s + Number(i.total || 0), 0) * 100) / 100;
    const discount = Math.max(0, Number(body.discount) || 0);
    const shippingCost = Math.max(0, Number(body.shippingCost) || 0);
    const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);

    let paymentMethod = String(body.paymentMethod || "cod").trim();
    if (paymentMethod === "card") paymentMethod = "bankTransfer";
    if (!PAYMENT_METHODS.has(paymentMethod)) paymentMethod = "cod";

    let paymentStatus = String(body.paymentStatus || "unpaid").trim();
    if (!["unpaid", "paid", "partial"].includes(paymentStatus)) paymentStatus = "unpaid";

    const receivedAmount = Math.max(0, Math.round((Number(body.receivedAmount) || 0) * 100) / 100);

    const invoiceNumber = await allocateInvoiceNumber();
    const adminLabel = user.name || user.email || "Admin";

    const saveCustomer = body.saveCustomer !== false;
    let linkedCustomerId = null;
    let savedCustomerEmail = email;
    let linkedCustomerDoc = null;

    if (saveCustomer) {
      try {
        const upserted = await upsertInvoiceCustomer({
          name,
          email,
          phone,
          city,
          address: street,
          customerId: customerIn.customerId,
        });
        linkedCustomerId = upserted.customerId;
        linkedCustomerDoc = upserted.customer || null;
        if (upserted.customer?.email && !String(upserted.customer.email).includes("@guest.invoice")) {
          savedCustomerEmail = upserted.customer.email;
        } else if (email) {
          savedCustomerEmail = email;
        } else {
          savedCustomerEmail = "";
        }
      } catch (err) {
        // Never block invoice creation on customer CRM sync failures.
        console.error("upsertInvoiceCustomer:", err?.message || err);
        linkedCustomerId = null;
        linkedCustomerDoc = null;
        savedCustomerEmail = email || "";
      }
    } else if (customerIn.customerId && mongoose.Types.ObjectId.isValid(String(customerIn.customerId))) {
      linkedCustomerId = customerIn.customerId;
    }

    let previousBalance = 0;
    if (linkedCustomerId) {
      try {
        if (!linkedCustomerDoc) {
          linkedCustomerDoc = await Customer.findById(linkedCustomerId).lean();
        }
        const ar = await getCustomerArSummary(linkedCustomerId, linkedCustomerDoc);
        previousBalance = ar.outstanding;
      } catch {
        previousBalance = 0;
      }
    }

    const payments = [];
    if (receivedAmount > 0) {
      let payMethod = paymentMethod === "cod" ? "cash" : paymentMethod;
      if (!["cod", "cash", "jazzcash", "easypaisa", "bankTransfer", "hbl", "meezan", "ubl", "other"].includes(payMethod)) {
        payMethod = "cash";
      }
      payments.push({
        amount: Math.min(receivedAmount, total),
        paidAt: new Date(),
        method: payMethod,
        note: "Received on invoice create",
        recordedBy: adminLabel,
      });
    }

    const paymentSnapshot = {
      pricing: { total },
      paymentStatus,
      payments,
      amountPaid: 0,
      remainingBalance: total,
    };
    recomputeInvoicePaymentFields(paymentSnapshot);

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: { name, email: savedCustomerEmail || email, phone },
      customerId: linkedCustomerId,
      billingAddress: {
        street,
        city,
        country: "Pakistan",
      },
      items: normalizedItems,
      pricing: { subtotal, discount, shippingCost, total },
      paymentStatus: paymentSnapshot.paymentStatus,
      paymentMethod,
      amountPaid: paymentSnapshot.amountPaid,
      remainingBalance: paymentSnapshot.remainingBalance,
      previousBalance,
      payments,
      note: String(body.note || "").trim().slice(0, 500),
      createdBy: adminLabel,
    });

    for (const line of normalizedItems) {
      if (!line.productId) continue;
      try {
        const product = await Product.findById(line.productId);
        if (!product || product.inventory?.trackInventory === false) continue;
        const qty = Number(product.inventory?.quantity) || 0;
        product.inventory = product.inventory || {};
        product.inventory.quantity = Math.max(0, qty - line.quantity);
        await product.save();
        await syncStockAlertForProduct(product);
      } catch {
        /* non-fatal */
      }
    }

    await logActivity({
      user: user.userId || user.id,
      userName: adminLabel,
      action: `Invoice ${invoiceNumber} created`,
      resource: "Invoice",
      resourceId: invoice._id.toString(),
      details: {
        invoiceNumber,
        total,
        itemCount: normalizedItems.length,
        customerId: linkedCustomerId ? String(linkedCustomerId) : null,
      },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      invoice: serializeInvoice(invoice),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not create invoice." },
      { status: 500 }
    );
  }
}
