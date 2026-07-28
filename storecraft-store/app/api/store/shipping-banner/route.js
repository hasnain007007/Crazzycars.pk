import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ShippingZone from "@/lib/models/Shipping.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { getZoneEstimatedDays } from "@/lib/shippingZoneWeight";
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  getEffectiveFreeDeliveryThreshold,
} from "@/lib/freeDelivery";

export const dynamic = "force-dynamic";

function normalizeDays(raw, fallback) {
  const s = String(raw || "")
    .replace(/\s*business\s*days?\s*/gi, "")
    .trim();
  return s || fallback;
}

function buildResponse({ freeShippingThreshold, majorDays, otherDays, freeShippingText, zones }) {
  const threshold =
    Math.max(0, Number(freeShippingThreshold) || DEFAULT_FREE_SHIPPING_THRESHOLD) ||
    DEFAULT_FREE_SHIPPING_THRESHOLD;
  const text =
    String(freeShippingText || "").trim() ||
    `Free delivery on orders over Rs. ${Math.round(threshold).toLocaleString("en-PK")}`;

  return {
    success: true,
    freeShippingThreshold: threshold,
    freeShippingText: text,
    majorCities: { days: majorDays, label: "Major cities" },
    otherAreas: { days: otherDays, label: "Other areas" },
    zones,
    deliverySummary: `Major cities: ${majorDays} days | Other areas: ${otherDays} days`,
    freeShippingMessage: text,
  };
}

export async function GET() {
  try {
    await dbConnect();

    const zones = await ShippingZone.find({ status: "active" }).sort({ sortOrder: 1 }).lean();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const sp = settings?.storePayment || {};
    const freeShippingThreshold = getEffectiveFreeDeliveryThreshold(sp);

    const majorDays = String(sp.majorCitiesDays || "").trim() || "2-3";
    const otherDays = String(sp.otherAreasDays || "").trim() || "4-7";
    const freeShippingText =
      String(sp.deliveryNote || "").trim() ||
      `Free delivery on orders over Rs. ${Math.round(freeShippingThreshold).toLocaleString("en-PK")}`;

    const zonesPayload = zones.map((z) => ({
      id: z._id?.toString?.() || String(z._id || ""),
      name: z.name,
      estimatedDays: normalizeDays(getZoneEstimatedDays(z), ""),
      provinces: Array.isArray(z.provinces) ? z.provinces : [],
      isDefault: Boolean(z.isDefault),
      sortOrder: z.sortOrder || 0,
    }));

    return NextResponse.json(
      buildResponse({
        freeShippingThreshold,
        majorDays,
        otherDays,
        freeShippingText,
        zones: zonesPayload,
      })
    );
  } catch {
    return NextResponse.json(
      buildResponse({
        freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
        majorDays: "2-3",
        otherDays: "4-7",
        freeShippingText: `Free delivery on orders over Rs. ${DEFAULT_FREE_SHIPPING_THRESHOLD.toLocaleString("en-PK")}`,
        zones: [],
      })
    );
  }
}
