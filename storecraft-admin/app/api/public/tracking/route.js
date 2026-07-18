import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { fetchPostexTracking } from "@/lib/postex";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

export const dynamic = "force-dynamic";

/**
 * Public tracking lookup for customer WhatsApp / storefront links.
 * No login — only returns courier status for a tracking number (no order PII).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = String(
      searchParams.get("trackingNumber") || searchParams.get("tracking") || ""
    ).trim();
    if (!trackingNumber || trackingNumber.length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid tracking number" },
        { status: 400 }
      );
    }

    let settingsCourier = null;
    try {
      await dbConnect();
      const settings =
        (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
        (await Settings.findOne({}).lean());
      settingsCourier = settings?.courier || null;
    } catch {
      /* env-only fallback */
    }

    const result = await fetchPostexTracking(trackingNumber, { settingsCourier });
    const status = result.success ? 200 : result.error === "Tracking unavailable" ? 503 : 404;
    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not connect to courier" },
      { status: 500 }
    );
  }
}
