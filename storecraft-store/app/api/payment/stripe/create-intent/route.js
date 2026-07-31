import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

async function getStripeSecretKey() {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("payment").lean()) ||
      (await Settings.findOne({}).select("payment").lean());

    const key =
      settings?.payment?.stripeSecretKey ||
      settings?.payment?.stripe?.secretKey;
    if (key && String(key).startsWith("sk_")) {
      return String(key);
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
      currency = "pkr",
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

    const oid = String(orderId || "").trim();
    if (!oid || !mongoose.Types.ObjectId.isValid(oid)) {
      return NextResponse.json(
        { success: false, error: "A valid orderId is required." },
        { status: 400 }
      );
    }

    await dbConnect();
    const order = await Order.findById(oid)
      .select("pricing.total paymentStatus paymentMethod customer.email customer.name orderNumber")
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

    // Never trust client-supplied amount — charge the server-side order total.
    const amount = Number(order.pricing?.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid order amount" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });

    const email =
      String(customerEmail || order.customer?.email || "").trim() || undefined;
    const name =
      String(customerName || order.customer?.name || "").trim() || undefined;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: String(currency || "pkr").toLowerCase(),
      payment_method_types: ["card"],
      metadata: {
        orderId: oid,
        orderNumber: String(order.orderNumber || ""),
        customerEmail: email || "",
        customerName: name || "",
        source: "crazzycars_store",
      },
      receipt_email: email,
      description: `${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} Order ${order.orderNumber || oid}`,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    });
  } catch (e) {
    console.error("Stripe create intent error:", e);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
