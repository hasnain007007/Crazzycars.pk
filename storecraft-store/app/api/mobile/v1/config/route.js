/**
 * GET /api/mobile/v1/config
 * App configuration: min versions, maintenance, shipping floors, payment methods, currency.
 * Public — no auth required.
 */
import { NextResponse } from "next/server";
import { STORE_CONTACT } from "@/config/store-policy";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";
import { shippingFloorPKR } from "@/lib/shippingTier";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const mobileApp = settingsDoc?.mobileApp || {};
    const pakMethods = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);

    // App UI is COD-only in v1; still expose all enabled methods for future releases.
    const enabledPaymentMethods = Object.entries(pakMethods)
      .filter(([, v]) => v?.enabled === true)
      .map(([key, v]) => ({
        key,
        label: v.label || key,
        icon: v.icon || key,
      }));

    const whatsapp =
      String(settingsDoc?.whatsapp?.number || "").trim() || STORE_CONTACT.whatsapp || STORE_CONTACT.phone;
    const storePhone =
      String(settingsDoc?.general?.phone || "").trim() || STORE_CONTACT.phone;
    const storeEmail =
      String(settingsDoc?.general?.email || "").trim() || STORE_CONTACT.email;

    return NextResponse.json({
      minVersionIos: mobileApp.minVersionIos || "1.0.0",
      minVersionAndroid: mobileApp.minVersionAndroid || "1.0.0",
      maintenanceMode: Boolean(mobileApp.maintenanceMode),
      maintenanceMessage:
        mobileApp.maintenanceMessage || "App is under maintenance. Please try again later.",
      iosStoreUrl: mobileApp.iosStoreUrl || "",
      androidStoreUrl: mobileApp.androidStoreUrl || "",
      currency: "PKR",
      shippingFloorStandard: shippingFloorPKR(false),
      shippingFloorBulky: shippingFloorPKR(true),
      enabledPaymentMethods,
      defaultPaymentMethod: "cod",
      contact: {
        phone: storePhone,
        whatsapp,
        email: storeEmail,
      },
      storeName: settingsDoc?.general?.storeName || "Crazzycars.pk",
      storePhone,
      whatsapp,
    });
  } catch (err) {
    console.error("[mobile/config]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not load config." } },
      { status: 500 }
    );
  }
}
