import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings from "@/lib/models/Settings.model";

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

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    // Never trust client-supplied amount — charge order.pricing.total only (COD/Stripe hard-lock pattern).
    const { currency = "PKR", orderId } = body;

    const oid = String(orderId || "").trim();
    if (!oid || !mongoose.Types.ObjectId.isValid(oid)) {
      return NextResponse.json(
        { success: false, error: "A valid orderId is required." },
        { status: 400 }
      );
    }

    const order = await Order.findById(oid).select("pricing.total paymentStatus orderNumber").lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (String(order.paymentStatus || "").toLowerCase() === "paid") {
      return NextResponse.json(
        { success: false, error: "Order is already paid." },
        { status: 409 }
      );
    }

    const amount = Number(order.pricing?.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid order amount" },
        { status: 400 }
      );
    }

    const settings = await Settings.findOne({}).select("payment").lean();

    const clientId = settings?.payment?.paypal?.clientId || "";
    const secret = settings?.payment?.paypal?.clientSecret || "";
    const mode = settings?.payment?.paypal?.mode || "sandbox";

    if (!clientId || !secret) {
      return NextResponse.json({ success: false, error: "PayPal not configured" });
    }

    const { token, base } = await getPayPalToken(clientId, secret, mode);

    if (!token) {
      return NextResponse.json({ success: false, error: "Failed to authenticate with PayPal" });
    }

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: String(currency || "PKR").toUpperCase(),
              value: amount.toFixed(2),
            },
            custom_id: oid,
            invoice_id: String(order.orderNumber || oid).slice(0, 127),
          },
        ],
      }),
    });

    const orderData = await orderRes.json();

    if (orderData.id) {
      return NextResponse.json({
        success: true,
        paypalOrderId: orderData.id,
      });
    }

    return NextResponse.json({
      success: false,
      error: orderData.message || "Failed to create PayPal order",
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
