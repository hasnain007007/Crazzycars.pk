import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import Order from "@/lib/models/Order.model";
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from "@/lib/email";
import { assertPayPalMatchesOrder } from "@/lib/paypalCaptureBind";

async function getPayPalToken(clientId, secret, mode) {
  const base =
    mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return { token: data.access_token, base };
}

async function sendPaidOrderEmail(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const settings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
  const storeName = settings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
  const logoUrl = settings?.general?.logo?.url || "";
  await sendCustomerOrderConfirmation(order, { storeName, logoUrl });
  await sendAdminOrderNotification(order);
}

/**
 * Mark an order paid only after verifying the PayPal order server-side.
 * Same binding as Stripe PUT /api/orders/[id]: custom_id must equal this order,
 * and the amount must equal order.pricing.total. Never trusts client orderId alone.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const paypalOrderId = String(body.paypalOrderId || "").trim();
    const orderId = String(body.orderId || "").trim();

    if (!paypalOrderId) {
      return NextResponse.json({ success: false, error: "Missing PayPal order ID" }, { status: 400 });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "A valid orderId is required." },
        { status: 400 }
      );
    }

    const existing = await Order.findById(orderId)
      .select("paymentStatus payment.paypalOrderId pricing.total")
      .lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (
      existing.paymentStatus === "paid" &&
      String(existing.payment?.paypalOrderId || "") === paypalOrderId
    ) {
      return NextResponse.json({
        success: true,
        order: { _id: String(orderId), paymentStatus: "paid", orderStatus: "processing" },
      });
    }

    const settings = await Settings.findOne({}).select("payment").lean();
    const clientId = settings?.payment?.paypal?.clientId || "";
    const secret = settings?.payment?.paypal?.clientSecret || "";
    const mode = settings?.payment?.paypal?.mode || "sandbox";

    if (!clientId || !secret) {
      return NextResponse.json({ success: false, error: "PayPal is not configured." }, { status: 503 });
    }

    const { token, base } = await getPayPalToken(clientId, secret, mode);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Failed to authenticate with PayPal" },
        { status: 502 }
      );
    }

    const getRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const paypalOrder = await getRes.json();
    if (!getRes.ok || !paypalOrder?.id) {
      return NextResponse.json(
        { success: false, error: "Could not verify payment with PayPal." },
        { status: 400 }
      );
    }

    const bound = assertPayPalMatchesOrder(paypalOrder, existing, orderId);
    if (!bound.ok) {
      return NextResponse.json({ success: false, error: bound.error }, { status: bound.status });
    }

    let captureData = paypalOrder;
    const status = String(paypalOrder.status || "").toUpperCase();
    if (status !== "COMPLETED") {
      if (status !== "APPROVED") {
        return NextResponse.json(
          { success: false, error: `Payment not completed (status: ${paypalOrder.status || "unknown"}).` },
          { status: 409 }
        );
      }
      const captureRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      captureData = await captureRes.json();
    }

    if (String(captureData.status || "").toUpperCase() !== "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Payment not completed", status: captureData.status },
        { status: 409 }
      );
    }

    const captured = assertPayPalMatchesOrder(captureData, existing, orderId);
    if (!captured.ok) {
      return NextResponse.json({ success: false, error: captured.error }, { status: captured.status });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          paymentStatus: "paid",
          orderStatus: "processing",
          status: "processing",
          "payment.paypalOrderId": paypalOrderId,
          "payment.paidAt": new Date(),
          "payment.amount": captured.amount,
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
      sendPaidOrderEmail(orderId).catch((e) => console.error("PayPal order email failed:", e));
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      order: {
        _id: String(order._id),
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to capture payment." }, { status: 500 });
  }
}
