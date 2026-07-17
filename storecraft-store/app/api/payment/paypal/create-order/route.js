import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
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
    const { amount, currency = "PKR", orderId } = body;

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
              currency_code: currency.toUpperCase(),
              value: Number(amount).toFixed(2),
            },
            custom_id: orderId || "",
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
