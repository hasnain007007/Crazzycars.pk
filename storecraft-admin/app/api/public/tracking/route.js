import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { resolvePublicTracking } from "@/lib/resolvePublicTracking";

export const dynamic = "force-dynamic";

/**
 * Public tracking lookup for customer WhatsApp / storefront links.
 * Supports PostEx and Run Courier (auto-detected from order / dual lookup).
 * No login — only returns courier status for a tracking number (no order PII beyond order #).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = String(
      searchParams.get("trackingNumber") || searchParams.get("tracking") || ""
    ).trim();
    if (!trackingNumber || trackingNumber.length < 4) {
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

    const result = await resolvePublicTracking(trackingNumber, { settingsCourier });
    // Strip internal raw payloads from public response
    if (result?.raw) delete result.raw;
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
