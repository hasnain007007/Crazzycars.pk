import { NextResponse } from "next/server";
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

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { paypalOrderId, orderId } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ success: false, error: "Missing PayPal order ID" });
    }

    const settings = await Settings.findOne({}).select("payment").lean();

    const clientId = settings?.payment?.paypal?.clientId || "";
    const secret = settings?.payment?.paypal?.clientSecret || "";
    const mode = settings?.payment?.paypal?.mode || "sandbox";

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
      if (orderId) {
        const capturedAmount = Number(
          captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0
        );
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          orderStatus: "processing",
          status: "processing",
          "payment.paypalOrderId": paypalOrderId,
          "payment.paidAt": new Date(),
          "payment.amount": capturedAmount,
        });
      }

      if (orderId) {
        const fullOrder = await Order.findById(orderId).lean();
        if (fullOrder) {
          const siteSettings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
          const storeName = siteSettings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Homefy.pk";
          const logoUrl = siteSettings?.general?.logo?.url || "";
          sendCustomerOrderConfirmation(fullOrder, { storeName, logoUrl }).catch((e) =>
            console.error("PayPal order email failed:", e)
          );
          sendAdminOrderNotification(fullOrder).catch((e) =>
            console.error("PayPal admin notification failed:", e)
          );
        }
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
