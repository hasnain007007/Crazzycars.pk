import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { buildStoreSettingsPayload, toPublicClientSettings } from "@/lib/normalizeStoreSettings";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

/** Public storefront settings — short CDN cache; admin changes appear within ~60s. */
export const revalidate = 60;

export async function GET(request) {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const url = request?.nextUrl || new URL(request.url);
    // Checkout / success need wallet + bank account lines; default payload redacts them.
    const includePaymentAccounts =
      url.searchParams.get("payments") === "1" ||
      url.searchParams.get("includePayments") === "1";
    const data = toPublicClientSettings(buildStoreSettingsPayload(settings), {
      includePaymentAccounts,
    });
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
          "Cache-Control": includePaymentAccounts
            ? "private, no-store"
            : "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load store." }, { status: 500 });
  }
}
