import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { buildStoreSettingsPayload, toPublicClientSettings } from "@/lib/normalizeStoreSettings";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

/** Public storefront settings — short CDN cache; admin changes appear within ~60s. */
export const revalidate = 60;

export async function GET() {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    // Never expose payment-provider secrets on this public endpoint.
    const data = toPublicClientSettings(buildStoreSettingsPayload(settings));
    return NextResponse.json(
      {
        success: true,
        data,
        store: {
          name: data.storeName,
          phone: data.phone,
          email: data.email,
          website: data.website,
          logoUrl: data.logoUrl,
          footerText: data.footerText,
          currency: data.currency,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load store." }, { status: 500 });
  }
}
