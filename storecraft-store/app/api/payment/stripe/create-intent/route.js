import { NextResponse } from "next/server";
import Stripe from "stripe";
import { dbConnect } from "@/lib/db";
import Settings from "@/lib/models/Settings.model";

async function getStripeSecretKey() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({})
      .select("payment.stripeSecretKey payment.stripe.secretKey payment.stripeEnabled")
      .lean();

    const key =
      settings?.payment?.stripeSecretKey ||
      settings?.payment?.stripe?.secretKey;
    if (key && key.startsWith("sk_")) {
      return key;
    }
    return process.env.STRIPE_SECRET_KEY || null;
  } catch {
    return process.env.STRIPE_SECRET_KEY || null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      amount,
      currency = "eur",
      orderId,
      customerEmail,
      customerName,
    } = body;

    const secretKey = await getStripeSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      metadata: {
        orderId: orderId || "",
        customerEmail: customerEmail || "",
        customerName: customerName || "",
        source: "sialkot_store",
      },
      receipt_email: customerEmail || undefined,
      description: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Order - ${orderId || 'New Order'}`,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (e) {
    console.error("Stripe create intent error:", e);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
