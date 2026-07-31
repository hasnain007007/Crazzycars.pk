import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { recordEmailSent, resolveOrderConfirmationEmail, sendEmail, sendAdminOrderNotification } from "@/lib/email";

async function getStripeSecretKey() {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("payment").lean()) ||
      (await Settings.findOne({}).select("payment").lean());
    const key =
      settings?.payment?.stripeSecretKey ||
      settings?.payment?.stripe?.secretKey ||
      process.env.STRIPE_SECRET_KEY ||
      "";
    return key && String(key).startsWith("sk_") ? String(key) : null;
  } catch {
    const key = process.env.STRIPE_SECRET_KEY || "";
    return key.startsWith("sk_") ? key : null;
  }
}

async function sendPaidOrderEmail(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order?.customer?.email) return;
  const settings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
  const storeName = settings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
  const logoUrl = settings?.general?.logo?.url || "";
  const { subject, html } = await resolveOrderConfirmationEmail(order, storeName, logoUrl);
  const sent = await sendEmail({
    to: order.customer.email,
    subject,
    html,
  });
  if (sent?.success) {
    await recordEmailSent(orderId, "order_confirmation", subject, order.customer.email);
  }
}

/**
 * Mark an order paid only after verifying the Stripe PaymentIntent server-side.
 * Rejects arbitrary client-supplied paymentStatus / orderStatus (was an open IDOR).
 */
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid order id." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const paymentIntentId = String(
      body.paymentIntentId || body["payment.stripePaymentIntentId"] || ""
    ).trim();

    if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json(
        { success: false, error: "A valid Stripe paymentIntentId is required." },
        { status: 400 }
      );
    }

    const secretKey = await getStripeSecretKey();
    if (!secretKey) {
      return NextResponse.json({ success: false, error: "Stripe is not configured." }, { status: 503 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Could not verify payment with Stripe." },
        { status: 400 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { success: false, error: `Payment not completed (status: ${paymentIntent.status}).` },
        { status: 409 }
      );
    }

    const metaOrderId = String(paymentIntent.metadata?.orderId || "").trim();
    if (!metaOrderId || metaOrderId !== String(id)) {
      return NextResponse.json(
        { success: false, error: "Payment does not match this order." },
        { status: 403 }
      );
    }

    const amountPaid =
      typeof paymentIntent.amount_received === "number" && paymentIntent.amount_received > 0
        ? paymentIntent.amount_received / 100
        : (Number(paymentIntent.amount) || 0) / 100;

    const existing = await Order.findById(id).select("paymentStatus payment.stripePaymentIntentId").lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Idempotent if already marked paid for this PI
    if (
      existing.paymentStatus === "paid" &&
      String(existing.payment?.stripePaymentIntentId || "") === paymentIntentId
    ) {
      return NextResponse.json({
        success: true,
        order: { _id: String(id), paymentStatus: "paid", orderStatus: "processing" },
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          paymentStatus: "paid",
          orderStatus: "processing",
          "payment.stripePaymentIntentId": paymentIntentId,
          "payment.paidAt": new Date(),
          "payment.amount": amountPaid,
          "payment.paidAmount": amountPaid,
        },
      },
      { new: true }
    )
      .select("_id orderNumber paymentStatus orderStatus")
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (existing.paymentStatus !== "paid") {
      sendPaidOrderEmail(id).catch((e) => console.error("Paid order email failed:", e));
      Order.findById(id)
        .lean()
        .then((o) => {
          if (o) sendAdminOrderNotification(o).catch((e) => console.error("Admin notification failed:", e));
        });
    }

    return NextResponse.json({
      success: true,
      order: {
        _id: String(order._id),
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to update order." },
      { status: 500 }
    );
  }
}
