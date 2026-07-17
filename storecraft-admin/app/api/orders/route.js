/**
 * Orders list with filters, pagination, and summary stats.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal } from "@/lib/orderFormat";

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
      filter.$or = [
        { orderNumber: rx },
        { "customer.name": rx },
        { "customer.email": rx },
      ];
    }

    const skip = (page - 1) * limit;
    const now = new Date();
    const dayStart = utcStartOfDay(now);
    const dayEnd = utcEndOfDay(now);

    const [items, total, totalOrders, pendingCount, processingCount, todayPaidOrders] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer.customerId", "name email")
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
    ]);

    let todayRevenue = 0;
    for (const o of todayPaidOrders) {
      todayRevenue += orderGrandTotal(o);
    }

    const orders = items.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      customerName: o.customer?.name || o.customer?.customerId?.name || "Guest",
      customerEmail: o.customer?.email || o.customer?.customerId?.email || "",
      shippingCity: o.shippingAddress?.city || "",
      shippingCountry: o.shippingAddress?.country || "",
      itemCount: Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0,
      lineCount: Array.isArray(o.items) ? o.items.length : 0,
      total: orderGrandTotal(o),
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
    }));

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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load orders." },
      { status: 500 }
    );
  }
}
