/**
 * GET /api/finance/orders/search?q= — find orders to manually match settlement lines
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const q = String(new URL(request.url).searchParams.get("q") || "").trim();
    if (q.length < 3) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const digits = q.replace(/\D/g, "");
    const or = [
      { orderNumber: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { "customer.phone": new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { "customer.name": new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
    if (digits.length >= 6) {
      or.push({ trackingNumber: digits });
      or.push({ "tracking.number": digits });
    }

    const orders = await Order.find({ $or: or })
      .select("orderNumber trackingNumber tracking.number customer.name customer.phone pricing.total paymentStatus")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        trackingNumber: o.trackingNumber || o.tracking?.number || "",
        customerName: o.customer?.name || "",
        phone: o.customer?.phone || "",
        total: Number(o.pricing?.total) || 0,
        paymentStatus: o.paymentStatus,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Search failed." },
      { status: 500 }
    );
  }
}
