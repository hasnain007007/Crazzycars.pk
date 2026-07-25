/**
 * Bulk update order status or payment for many orders at once.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Order from "@/lib/models/Order.model";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";
import { requestIp } from "@/lib/requestIp";

const MAX_IDS = 100;

function titleCaseStatus(s) {
  if (!s) return "";
  return String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function PUT(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const value = body.value;
    const rawIds = Array.isArray(body.orderIds) ? body.orderIds : [];
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

    if (action !== "updateStatus" && action !== "updatePayment") {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
    }

    const orderIds = rawIds
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, MAX_IDS);

    if (!orderIds.length) {
      return NextResponse.json({ success: false, error: "No valid order ids." }, { status: 400 });
    }

    const adminName = user.name || "Admin";
    let updated = 0;

    if (action === "updateStatus") {
      const allowed = [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "refunded",
        "disputed",
      ];
      if (!allowed.includes(value)) {
        return NextResponse.json({ success: false, error: "Invalid order status." }, { status: 400 });
      }
      for (const id of orderIds) {
        const order = await Order.findById(id);
        if (!order) continue;
        if (order.orderStatus === value) continue;
        order.orderStatus = value;
        order.statusHistory.push({
          status: value,
          changedBy: adminName,
          changedAt: new Date(),
          note: note || "Bulk update by admin",
        });
        const statusInfo = ORDER_STATUS_TIMELINE_TITLES[value] || { title: value, description: "" };
        if (!Array.isArray(order.timeline)) order.timeline = [];
        order.timeline.push({
          status: value,
          title: statusInfo.title,
          description: statusInfo.description,
          timestamp: new Date(),
          by: "admin",
        });
        order.markModified("timeline");
        await order.save();
        updated += 1;
      }
    } else {
      const allowedPay = ["unpaid", "paid", "refunded", "partial"];
      if (!allowedPay.includes(value)) {
        return NextResponse.json({ success: false, error: "Invalid payment status." }, { status: 400 });
      }
      for (const id of orderIds) {
        const order = await Order.findById(id);
        if (!order) continue;
        if (order.paymentStatus === value) continue;
        order.paymentStatus = value;
        await order.save();
        updated += 1;
      }
    }

    const label = titleCaseStatus(value);
    await logActivity({
      user: user.userId,
      userName: adminName,
      action:
        action === "updateStatus"
          ? `Bulk updated ${updated} orders to ${label}`
          : `Bulk updated payment on ${updated} orders to ${label}`,
      resource: "Order",
      resourceId: "bulk",
      details: { count: updated, action, value, orderIds },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Bulk update failed." },
      { status: 500 }
    );
  }
}
