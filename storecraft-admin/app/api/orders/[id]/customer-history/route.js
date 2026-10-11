/**
 * GET /api/orders/[id]/customer-history
 * Prior (and current) orders for the same customer — phone / email / customerId.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import { withoutDemo } from "@/lib/orderDemoFilter";
import {
  buildCustomerHistoryFilter,
  identityFromOrder,
  serializeHistoryOrder,
  summarizeHistory,
} from "@/lib/customerOrderHistory";

export async function GET(request, { params }) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    await dbConnect();
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid order id" }, { status: 400 });
    }

    const current = await Order.findById(id).lean();
    if (!current || current.isDemo) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const identity = identityFromOrder(current);
    const match = buildCustomerHistoryFilter(current);
    if (!match) {
      return NextResponse.json({
        success: true,
        identity,
        summary: {
          totalOrders: 1,
          priorOrders: 0,
          delivered: 0,
          cancelled: 0,
          spentPrior: 0,
          isRepeat: false,
        },
        orders: [serializeHistoryOrder(current, id)],
      });
    }

    const docs = await Order.find(withoutDemo(match))
      .sort({ createdAt: -1 })
      .limit(40)
      .select({
        orderNumber: 1,
        createdAt: 1,
        orderStatus: 1,
        paymentStatus: 1,
        paymentMethod: 1,
        currency: 1,
        pricing: 1,
        totals: 1,
        total: 1,
        items: 1,
        trackingNumber: 1,
        tracking: 1,
        courier: 1,
        trackingUrl: 1,
        previousTrackings: 1,
        shippedAt: 1,
        deliveredAt: 1,
        shippingAddress: 1,
      })
      .lean();

    const orders = docs.map((d) => serializeHistoryOrder(d, id));
    // Ensure current order is present even if filter somehow missed it
    if (!orders.some((o) => o.isCurrent)) {
      orders.unshift(serializeHistoryOrder(current, id));
    }

    return NextResponse.json({
      success: true,
      identity: {
        phone: identity.phone,
        email: identity.email || "",
        customerId: identity.customerId || "",
      },
      summary: summarizeHistory(orders),
      orders,
    });
  } catch (err) {
    console.error("[customer-history]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load customer history" },
      { status: 500 }
    );
  }
}
