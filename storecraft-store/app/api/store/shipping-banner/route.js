import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ShippingZone from "@/lib/models/Shipping.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { getZoneEstimatedDays } from "@/lib/shippingZoneWeight";
import {
  deliveryEtaSummary,
  lahoreEtaRange,
  nonLahoreEtaStatement,
  sanitizeCustomerShippingNote,
  standardDeliveryFeeStatement,
} from "@/lib/storePolicyCopy";

export const dynamic = "force-dynamic";

function normalizeDays(raw, fallback) {
  const s = String(raw || "")
    .replace(/\s*business\s*days?\s*/gi, "")
    .trim();
  return s || fallback;
}

function buildResponse({ deliveryFeeText, majorDays, otherCopy, zones }) {
  return {
    success: true,
    deliveryFeeText,
    majorCities: { days: majorDays, label: "Lahore (confirmed)" },
    otherAreas: {
      days: null,
      copy: otherCopy,
      label: "Other cities (no confirmed ETA)",
    },
    zones,
    deliverySummary: deliveryEtaSummary(),
    // Legacy keys kept so older PDP clients don't crash; values are fee copy, not free-ship.
    freeShippingThreshold: 0,
    freeShippingText: deliveryFeeText,
    freeShippingMessage: deliveryFeeText,
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
    const deliveryFeeText = sanitizeCustomerShippingNote(sp.deliveryNote);
    const majorDays = lahoreEtaRange();
    const otherCopy = nonLahoreEtaStatement();

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
        deliveryFeeText,
        majorDays,
        otherCopy,
        zones: zonesPayload,
      })
    );
  } catch {
    return NextResponse.json(
      buildResponse({
        deliveryFeeText: standardDeliveryFeeStatement(),
        majorDays: lahoreEtaRange(),
        otherCopy: nonLahoreEtaStatement(),
        zones: [],
      })
    );
  }
}
