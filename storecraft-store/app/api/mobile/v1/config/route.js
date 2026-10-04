/**
 * GET /api/mobile/v1/config
 * App configuration: min versions, maintenance, shipping floors, payment methods (+ details), currency.
 * Public — no auth required.
 */
import { NextResponse } from "next/server";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildConfigPaymentMethods } from "@/lib/mobile/paymentInstructions";
import { shippingFloorPKR } from "@/lib/shippingTier";
import {
  deliveryEtaSummary,
  lahoreEtaStatement,
  nonLahoreEtaStatement,
  standardDeliveryFeeShort,
  standardDeliveryFeeStatement,
} from "@/lib/storePolicyCopy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const mobileApp = settingsDoc?.mobileApp || {};
    const { enabledPaymentMethods, whatsapp: waContact } = buildConfigPaymentMethods(settingsDoc);

    const whatsapp =
      waContact.number ||
      String(settingsDoc?.whatsapp?.number || "").trim() ||
      STORE_CONTACT.whatsapp ||
      STORE_CONTACT.phone;
    const storePhone =
      String(settingsDoc?.general?.phone || "").trim() || STORE_CONTACT.phone;
    const storeEmail =
      String(settingsDoc?.general?.email || "").trim() || STORE_CONTACT.email;

    const defaultPaymentMethod = enabledPaymentMethods.some((m) => m.key === "cod")
      ? "cod"
      : enabledPaymentMethods[0]?.key || "cod";

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
      defaultPaymentMethod,
      contact: {
        phone: storePhone,
        whatsapp,
        email: storeEmail,
      },
      whatsapp: {
        number: waContact.number,
        display: waContact.display,
        waMeDigits: waContact.waMeDigits,
      },
      storeName: settingsDoc?.general?.storeName || "Crazzycars.pk",
      storePhone,
      /** Confirmed policy copy from store-policy / storePolicyCopy (same as COD FAQ). */
      delivery: {
        feeShort: standardDeliveryFeeShort(),
        feeStatement: standardDeliveryFeeStatement(),
        etaSummary: deliveryEtaSummary(),
        lahore: {
          minDays: STORE_POLICY.shipping.cityETAs.lahore.minDays,
          maxDays: STORE_POLICY.shipping.cityETAs.lahore.maxDays,
          text: lahoreEtaStatement(),
        },
        otherCitiesText: nonLahoreEtaStatement(),
        shipNote: "Most orders ship within 1–2 business days after payment confirmation.",
      },
    });
  } catch (err) {
    console.error("[mobile/config]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not load config." } },
      { status: 500 }
    );
  }
}
