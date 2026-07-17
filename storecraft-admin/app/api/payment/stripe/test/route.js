import { NextResponse } from "next/server";
import Stripe from "stripe";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

/**
 * Verifies the configured Stripe secret key by calling the Stripe API.
 * Uses balance.retrieve (works for all standard secret keys).
 */
export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("payment").lean()) ||
      (await Settings.findOne({}).select("payment").lean());

    const secretKey =
      settings?.payment?.stripeSecretKey ||
      settings?.payment?.stripe?.secretKey ||
      process.env.STRIPE_SECRET_KEY ||
      "";

    if (!secretKey || !secretKey.startsWith("sk_")) {
      return NextResponse.json({
        success: false,
        error: "Invalid or missing Stripe secret key",
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });

    const balance = await stripe.balance.retrieve();

    return NextResponse.json({
      success: true,
      message: "Stripe connected successfully",
      mode: secretKey.startsWith("sk_live_") ? "Live" : "Test",
      available: balance.available?.length
        ? balance.available.map((b) => `${(b.amount || 0) / 100} ${b.currency}`).join(", ")
        : "0",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Stripe connection failed",
      },
      { status: 400 }
    );
  }
}
