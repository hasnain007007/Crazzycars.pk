/**
 * Orders list with filters, pagination, and summary stats.
 * POST creates an admin invoice / walk-in sale.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import { allocateOrderNumber } from "@/lib/orderNumber";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { syncStockAlertForProduct } from "@/lib/productMutations";

const PAYMENT_METHODS = new Set([
  "cod",
  "stripe",
  "paypal",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
]);

const PAYMENT_STATUSES = new Set(["unpaid", "paid", "partial", "failed", "refunded"]);

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

function utcStartOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const status = (searchParams.get("status") || "").trim();
    const paymentStatus = (searchParams.get("paymentStatus") || "").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter = {};
    if (status && status !== "all") filter.orderStatus = status;
    if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$gte = utcStartOfDay(d);
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$lte = utcEndOfDay(d);
      }
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const digits = search.replace(/\D/g, "");
      const or = [
        { orderNumber: rx },
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { "shippingAddress.phone": rx },
        { tags: rx },
      ];
      // Phone-heavy guest checkouts: match digit runs in phone / guest+…@ email
      if (digits.length >= 7) {
        const digitRx = new RegExp(escapeRegex(digits));
        or.push({ "customer.phone": digitRx });
        or.push({ "shippingAddress.phone": digitRx });
        or.push({ "customer.email": new RegExp(`guest\\+${escapeRegex(digits)}`, "i") });
      }
      filter.$or = or;
    }

    const tag = (searchParams.get("tag") || "").trim();
    if (tag) {
      filter.tags = tag;
    }

    const view = (searchParams.get("view") || "").trim();
    const nowForView = new Date();
    const dayStartView = utcStartOfDay(nowForView);
    const dayEndView = utcEndOfDay(nowForView);
    // Needs Attention === stale rule (OR8): pending + unpaid + age >= 10 days
    const attentionCutoff = new Date(nowForView.getTime() - 10 * 86_400_000);

    if (view === "unfulfilled") {
      filter.orderStatus = { $in: ["pending", "confirmed", "processing", "packed"] };
    } else if (view === "unpaid") {
      filter.paymentStatus = "unpaid";
      filter.orderStatus = { $nin: ["cancelled", "refunded"] };
    } else if (view === "needsAttention") {
      filter.orderStatus = "pending";
      filter.paymentStatus = "unpaid";
      filter.createdAt = { ...(filter.createdAt || {}), $lte: attentionCutoff };
    } else if (view === "today") {
      filter.createdAt = { $gte: dayStartView, $lte: dayEndView };
    }

    const skip = (page - 1) * limit;
    const now = new Date();
    const dayStart = utcStartOfDay(now);
    const dayEnd = utcEndOfDay(now);

    const [
      items,
      total,
      totalOrders,
      pendingCount,
      processingCount,
      todayPaidOrders,
      pendingUnpaidOrders,
      viewUnfulfilled,
      viewUnpaid,
      viewNeedsAttention,
      viewToday,
    ] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer.customerId", "name email phone")
        .lean(),
      Order.countDocuments(filter),
      Order.countDocuments({}),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments({ orderStatus: "processing" }),
      Order.find({
        paymentStatus: "paid",
        createdAt: { $gte: dayStart, $lte: dayEnd },
      })
        .select("pricing total")
        .lean(),
      Order.find({ orderStatus: "pending", paymentStatus: "unpaid" })
        .select("pricing total")
        .lean(),
      Order.countDocuments({
        orderStatus: { $in: ["pending", "confirmed", "processing", "packed"] },
      }),
      Order.countDocuments({
        paymentStatus: "unpaid",
        orderStatus: { $nin: ["cancelled", "refunded"] },
      }),
      Order.countDocuments({
        orderStatus: "pending",
        paymentStatus: "unpaid",
        createdAt: { $lte: attentionCutoff },
      }),
      Order.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
    ]);

    let todayRevenue = 0;
    for (const o of todayPaidOrders) {
      todayRevenue += orderGrandTotal(o);
    }

    let pendingValueAtRisk = 0;
    for (const o of pendingUnpaidOrders) {
      pendingValueAtRisk += orderGrandTotal(o);
    }

    // Repeat-customer signal: same phone, >1 order in last 24h
    const since24h = new Date(Date.now() - 86_400_000);
    const phonesOnPage = [
      ...new Set(
        items
          .map((o) => String(o.customer?.phone || o.shippingAddress?.phone || "").replace(/\D/g, ""))
          .filter((p) => p.length >= 10)
      ),
    ];
    const phoneRepeatMap = new Map();
    if (phonesOnPage.length) {
      const phoneOr = phonesOnPage.flatMap((d) => [
        { "customer.phone": new RegExp(d) },
        { "shippingAddress.phone": new RegExp(d) },
        { "customer.email": new RegExp(`guest\\+${d}`, "i") },
      ]);
      const recentSamePhone = await Order.find({
        createdAt: { $gte: since24h },
        $or: phoneOr,
      })
        .select("customer.phone customer.email shippingAddress.phone createdAt")
        .lean();
      for (const row of recentSamePhone) {
        const d = String(
          row.customer?.phone || row.shippingAddress?.phone || ""
        ).replace(/\D/g, "");
        const fromEmail = String(row.customer?.email || "").match(/guest\+(\d+)/i)?.[1] || "";
        const key = d.length >= 10 ? d : fromEmail;
        if (!key) continue;
        phoneRepeatMap.set(key, (phoneRepeatMap.get(key) || 0) + 1);
      }
    }

    const orders = items.map((o) => {
      const phone = o.customer?.phone || o.shippingAddress?.phone || o.customer?.customerId?.phone || "";
      const digits = String(phone).replace(/\D/g, "");
      const emailDigits = String(o.customer?.email || "").match(/guest\+(\d+)/i)?.[1] || "";
      const phoneKey = digits.length >= 10 ? digits : emailDigits;
      const ordersLast24h = phoneKey ? phoneRepeatMap.get(phoneKey) || 1 : 1;
      return {
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        customerName: o.customer?.name || o.customer?.customerId?.name || "Guest",
        customerEmail: o.customer?.email || o.customer?.customerId?.email || "",
        customerPhone: phone || emailDigits,
        shippingCity: o.shippingAddress?.city || "",
        shippingCountry: o.shippingAddress?.country || "",
        itemCount: Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0,
        lineCount: Array.isArray(o.items) ? o.items.length : 0,
        total: orderGrandTotal(o),
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        trackingNumber: o.trackingNumber || o.tracking?.number || "",
        liveStatus: o.tracking?.lastStatus || "",
        liveLocation: o.tracking?.currentLocation || "",
        liveStatusAt: o.tracking?.lastStatusAt || null,
        tags: Array.isArray(o.tags) ? o.tags : [],
        ordersLast24h,
        isRepeatToday: ordersLast24h > 1,
        // Computed at query time (OR8) — never stored on the order document
        isStale:
          String(o.orderStatus || "").toLowerCase() === "pending" &&
          String(o.paymentStatus || "").toLowerCase() === "unpaid" &&
          o.createdAt != null &&
          now.getTime() - new Date(o.createdAt).getTime() >= 10 * 86_400_000,
      };
    });

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        totalOrders,
        pending: pendingCount,
        processing: processingCount,
        todayRevenue,
        pendingValueAtRisk,
      },
      views: {
        all: totalOrders,
        unfulfilled: viewUnfulfilled,
        unpaid: viewUnpaid,
        needsAttention: viewNeedsAttention,
        today: viewToday,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load orders." },
      { status: 500 }
    );
  }
}

/**
 * Create invoice / walk-in sale from admin.
 * Body: { customer, shippingAddress?, items[], shippingCost?, discount?, paymentMethod?, paymentStatus?, note? }
 */
export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    await dbConnect();
    const body = await request.json().catch(() => ({}));

    const customerIn = body.customer && typeof body.customer === "object" ? body.customer : {};
    const shipIn =
      body.shippingAddress && typeof body.shippingAddress === "object" ? body.shippingAddress : {};

    const firstName = String(customerIn.firstName || shipIn.firstName || "").trim();
    const lastName = String(customerIn.lastName || shipIn.lastName || "").trim();
    const name =
      String(customerIn.name || "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim();
    const phone = String(customerIn.phone || shipIn.phone || "").trim();
    const email = String(customerIn.email || shipIn.email || "").trim().toLowerCase();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Customer name is required." },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Customer phone is required." },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length < 1) {
      return NextResponse.json(
        { success: false, error: "Add at least one product." },
        { status: 400 }
      );
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
        ? await Product.find({ _id: { $in: productIds } })
            .select("name media pricing inventory")
            .lean()
        : [];
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const normalizedItems = [];
    for (const raw of body.items) {
      const productIdRaw = String(raw?.productId || "").trim();
      const product =
        productIdRaw && mongoose.Types.ObjectId.isValid(productIdRaw)
          ? byId.get(productIdRaw)
          : null;
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
      const unitCost = Math.max(
        0,
        Number(raw?.unitCost ?? product?.pricing?.costPerItem ?? 0) || 0
      );
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
    if (!PAYMENT_METHODS.has(paymentMethod)) paymentMethod = "cod";

    let paymentStatus = String(body.paymentStatus || "unpaid").trim();
    if (!PAYMENT_STATUSES.has(paymentStatus)) paymentStatus = "unpaid";

    const city = String(shipIn.city || customerIn.city || "").trim();
    const street = String(
      shipIn.street || shipIn.address || shipIn.line1 || customerIn.address || ""
    ).trim();

    const orderNumber = await allocateOrderNumber();
    const adminLabel = user.name || user.email || "Admin";
    const note = String(body.note || "").trim().slice(0, 500);

    const order = await Order.create({
      orderNumber,
      customer: {
        firstName,
        lastName,
        name,
        email,
        phone,
        customerId: mongoose.Types.ObjectId.isValid(String(customerIn.customerId || ""))
          ? customerIn.customerId
          : null,
      },
      items: normalizedItems,
      subtotal,
      shippingCost,
      pricing: {
        subtotal,
        discount,
        shippingCost,
        shippingMethod: shippingCost > 0 ? "admin_invoice" : "pickup",
        shippingZone: "",
        total,
      },
      orderStatus: "confirmed",
      paymentStatus,
      paymentMethod,
      currency: "PKR",
      payment: {
        amount: total,
        paidAmount: paymentStatus === "paid" ? total : 0,
        paidAt: paymentStatus === "paid" ? new Date() : undefined,
      },
      shippingAddress: {
        firstName,
        lastName,
        name,
        email,
        phone,
        street,
        address: street,
        line1: street,
        city,
        country: String(shipIn.country || "Pakistan").trim() || "Pakistan",
      },
      statusHistory: [
        {
          status: "confirmed",
          changedBy: adminLabel,
          changedAt: new Date(),
          note: "Invoice created in admin",
        },
      ],
      timeline: [
        {
          status: "confirmed",
          title: "Invoice created",
          description: note || `Created by ${adminLabel} · ${normalizedItems.length} item(s)`,
          timestamp: new Date(),
          by: "admin",
        },
      ],
      ...(note
        ? {
            internalNotes: [
              {
                note,
                addedBy: adminLabel,
                addedAt: new Date(),
              },
            ],
          }
        : {}),
    });

    // Deduct stock for catalog products (walk-in / invoice sales)
    for (const line of normalizedItems) {
      if (!line.productId) continue;
      try {
        const product = await Product.findById(line.productId);
        if (!product) continue;
        if (product.inventory?.trackInventory === false) continue;
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
      user: user.userId || user.id || user._id,
      userName: adminLabel,
      action: `Invoice ${orderNumber} created`,
      resource: "Order",
      resourceId: order._id.toString(),
      details: { orderNumber, total, itemCount: normalizedItems.length },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        total,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not create invoice." },
      { status: 500 }
    );
  }
}

