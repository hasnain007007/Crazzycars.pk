/**
 * Single invoice: read, update.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Invoice from "@/lib/models/Invoice.model";
import Product from "@/lib/models/Product.model";
import { upsertInvoiceCustomer } from "@/lib/upsertInvoiceCustomer";

const PAYMENT_METHODS = new Set([
  "cod",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
  "stripe",
  "paypal",
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
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
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
      unitCost: i.unitCost,
      total: i.total,
    })),
    pricing: o.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 },
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    currency: o.currency || "PKR",
    note: o.note || "",
    createdBy: o.createdBy || "",
    orderNumber: o.invoiceNumber,
  };
}

async function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1) {
    throw new Error("Add at least one product.");
  }
  const productIds = [
    ...new Set(
      rawItems
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
  for (const raw of rawItems) {
    const productIdRaw = String(raw?.productId || "").trim();
    const product =
      productIdRaw && mongoose.Types.ObjectId.isValid(productIdRaw) ? byId.get(productIdRaw) : null;
    const nameItem = String(raw?.name || product?.name || "").trim();
    const quantity = Math.max(1, Math.min(999, Math.round(Number(raw?.quantity) || 1)));
    let unitPrice = Number(raw?.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      unitPrice = product ? unitPriceFromProduct(product) : 0;
    }
    if (!nameItem) throw new Error("Each item needs a product name.");
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
  return normalizedItems;
}

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Invoice.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, invoice: serializeInvoice(doc) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load invoice." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const customerIn = body.customer && typeof body.customer === "object" ? body.customer : null;

    if (customerIn) {
      const name = String(customerIn.name || "").trim();
      const phone = String(customerIn.phone || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Customer name is required." }, { status: 400 });
      }
      if (!phone) {
        return NextResponse.json({ success: false, error: "Customer phone is required." }, { status: 400 });
      }
      const email = String(customerIn.email || "").trim().toLowerCase();
      const city = String(customerIn.city || body.billingAddress?.city || invoice.billingAddress?.city || "").trim();
      const street = String(
        customerIn.address || body.billingAddress?.street || invoice.billingAddress?.street || ""
      ).trim();

      let linkedCustomerId = invoice.customerId;
      if (body.saveCustomer !== false) {
        const upserted = await upsertInvoiceCustomer({
          name,
          email,
          phone,
          city,
          address: street,
          customerId: customerIn.customerId || invoice.customerId,
        });
        linkedCustomerId = upserted.customerId;
      }

      invoice.customer = { name, email, phone };
      invoice.customerId = linkedCustomerId;
      invoice.billingAddress = { street, city, country: "Pakistan" };
    }

    if (Array.isArray(body.items)) {
      try {
        const normalizedItems = await normalizeItems(body.items);
        const subtotal =
          Math.round(normalizedItems.reduce((s, i) => s + Number(i.total || 0), 0) * 100) / 100;
        const discount =
          body.discount !== undefined
            ? Math.max(0, Number(body.discount) || 0)
            : Math.max(0, Number(invoice.pricing?.discount) || 0);
        const shippingCost =
          body.shippingCost !== undefined
            ? Math.max(0, Number(body.shippingCost) || 0)
            : Math.max(0, Number(invoice.pricing?.shippingCost) || 0);
        const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);
        invoice.items = normalizedItems;
        invoice.pricing = { subtotal, discount, shippingCost, total };
        invoice.markModified("items");
        invoice.markModified("pricing");
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    } else if (body.discount !== undefined || body.shippingCost !== undefined) {
      const subtotal = Math.max(0, Number(invoice.pricing?.subtotal) || 0);
      const discount =
        body.discount !== undefined
          ? Math.max(0, Number(body.discount) || 0)
          : Math.max(0, Number(invoice.pricing?.discount) || 0);
      const shippingCost =
        body.shippingCost !== undefined
          ? Math.max(0, Number(body.shippingCost) || 0)
          : Math.max(0, Number(invoice.pricing?.shippingCost) || 0);
      const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);
      invoice.pricing = {
        ...(invoice.pricing?.toObject?.() || invoice.pricing || {}),
        subtotal,
        discount,
        shippingCost,
        total,
      };
      invoice.markModified("pricing");
    }

    if (body.paymentMethod !== undefined) {
      let paymentMethod = String(body.paymentMethod || "cod").trim();
      if (paymentMethod === "card") paymentMethod = "bankTransfer";
      if (!PAYMENT_METHODS.has(paymentMethod)) paymentMethod = "cod";
      invoice.paymentMethod = paymentMethod;
    }
    if (body.paymentStatus !== undefined) {
      let paymentStatus = String(body.paymentStatus || "paid").trim();
      if (!["unpaid", "paid", "partial"].includes(paymentStatus)) paymentStatus = "paid";
      invoice.paymentStatus = paymentStatus;
    }
    if (body.note !== undefined) {
      invoice.note = String(body.note || "").trim().slice(0, 500);
    }

    await invoice.save();

    await logActivity({
      user: user.userId || user.id,
      userName: user.name || user.email || "Admin",
      action: `Invoice ${invoice.invoiceNumber} updated`,
      resource: "Invoice",
      resourceId: id,
      details: { invoiceNumber: invoice.invoiceNumber },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, invoice: serializeInvoice(invoice) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not update invoice." },
      { status: 500 }
    );
  }
}
