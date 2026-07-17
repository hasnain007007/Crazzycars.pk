import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }

    await dbConnect();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "refunded") {
      return NextResponse.json({
        success: false,
        error: "Order already refunded",
      });
    }

    const sk = process.env.STRIPE_SECRET_KEY || "";
    if (order.payment?.stripePaymentIntentId && sk && !sk.includes("placeholder")) {
      const stripe = new Stripe(sk);
      await stripe.refunds.create({
        payment_intent: order.payment.stripePaymentIntentId,
      });
    }

    order.paymentStatus = "refunded";
    order.orderStatus = "refunded";
    order.payment = order.payment || {};
    order.payment.refundedAt = new Date();
    order.markModified("payment");
    await order.save();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: "Order refund",
      resource: "Order",
      resourceId: String(order._id),
      type: "orders",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Refund failed" }, { status: 500 });
  }
}
