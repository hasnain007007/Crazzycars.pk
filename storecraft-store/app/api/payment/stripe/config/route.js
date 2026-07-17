import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings from "@/lib/models/Settings.model";

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({}).select("payment").lean();

    const publishableKey =
      settings?.payment?.stripePublishableKey ||
      settings?.payment?.stripe?.publishableKey ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      "";

    const enabledRaw =
      settings?.payment?.stripeEnabled ??
      settings?.payment?.stripe?.enabled;
    const enabled = enabledRaw !== false;

    return NextResponse.json({
      success: true,
      publishableKey,
      enabled,
    });
  } catch {
    return NextResponse.json({
      success: true,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      enabled: true,
    });
  }
}
