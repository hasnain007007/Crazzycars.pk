import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import Order from "@/lib/models/Order.model";
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from "@/lib/email";

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

function amountsMatch(a, b, tolerance = 0.01) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) <= tolerance;
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { paypalOrderId, orderId } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ success: false, error: "Missing PayPal order ID" }, { status: 400 });
    }

    const oid = String(orderId || "").trim();
    if (!oid || !mongoose.Types.ObjectId.isValid(oid)) {
      return NextResponse.json(
        { success: false, error: "A valid orderId is required." },
        { status: 400 }
      );
    }

    const order = await Order.findById(oid)
      .select("pricing.total paymentStatus orderNumber customer")
      .lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (String(order.paymentStatus || "").toLowerCase() === "paid") {
      return NextResponse.json(
        { success: false, error: "Order is already paid." },
        { status: 409 }
      );
    }

    const expectedTotal = Number(order.pricing?.total);
    if (!Number.isFinite(expectedTotal) || expectedTotal <= 0) {
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
      return NextResponse.json({ success: false, error: "PayPal not configured" }, { status: 500 });
    }

    const { token, base } = await getPayPalToken(clientId, secret, mode);

    if (!token) {
      return NextResponse.json({ success: false, error: "Failed to authenticate with PayPal" });
    }

    const captureRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();

    if (captureData.status === "COMPLETED") {
      const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
      const capturedAmount = Number(capture?.amount?.value || 0);
      const customId = String(captureData.purchase_units?.[0]?.custom_id || "").trim();

      // Bind capture to this order and refuse amount mismatches (anti underpay).
      if (customId && customId !== oid) {
        return NextResponse.json(
          { success: false, error: "PayPal order does not match this store order." },
          { status: 409 }
        );
      }

      if (!amountsMatch(capturedAmount, expectedTotal)) {
        console.error("PayPal capture amount mismatch", {
          orderId: oid,
          expectedTotal,
          capturedAmount,
          paypalOrderId,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Payment amount does not match order total. Order was not marked paid.",
          },
          { status: 409 }
        );
      }

      await Order.findByIdAndUpdate(oid, {
        paymentStatus: "paid",
        orderStatus: "processing",
        status: "processing",
        "payment.paypalOrderId": paypalOrderId,
        "payment.paidAt": new Date(),
        // Record the server order total, not a client-supplied figure.
        "payment.amount": expectedTotal,
      });

      const fullOrder = await Order.findById(oid).lean();
      if (fullOrder) {
        const siteSettings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
        const storeName =
          siteSettings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
        const logoUrl = siteSettings?.general?.logo?.url || "";
        sendCustomerOrderConfirmation(fullOrder, { storeName, logoUrl }).catch((e) =>
          console.error("PayPal order email failed:", e)
        );
        sendAdminOrderNotification(fullOrder).catch((e) =>
          console.error("PayPal admin notification failed:", e)
        );
      }

      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        details: captureData,
      });
    }

    return NextResponse.json({
      success: false,
      error: "Payment not completed",
      status: captureData.status,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
