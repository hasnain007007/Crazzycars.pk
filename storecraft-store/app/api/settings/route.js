import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { buildStoreSettingsPayload } from "@/lib/normalizeStoreSettings";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const data = buildStoreSettingsPayload(settings);
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
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load store." }, { status: 500 });
  }
}
