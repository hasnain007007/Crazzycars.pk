/**
 * Country / city + weight (grams) shipping for ShippingZone documents.
 * Store policy: no free delivery — never waive shipping for order value.
 */
import { STORE_POLICY } from "@/config/store-policy";

const FLAT_FEE = STORE_POLICY.shipping.standardFeePKR;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

export function pickShippingZone(zones, country, city) {
  if (!Array.isArray(zones) || !zones.length) return null;
  const countryLower = norm(country);
  const cityLower = norm(city);
  let defaultZone = null;
  const ordered = [...zones].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  for (const z of ordered) {
    if (z?.isDefault) defaultZone = z;
  }

  for (const zone of ordered) {
    if (zone?.isDefault) continue;
    const countries = zone?.countries;
    if (Array.isArray(countries) && countries.length > 0 && countryLower) {
      const hit = countries.some((c) => norm(c) === countryLower);
      if (hit) return zone;
    }
  }

  for (const zone of ordered) {
    if (zone?.isDefault) continue;
    const cities = zone?.cities;
    if (Array.isArray(cities) && cities.length > 0 && cityLower) {
      const hit = cities.some((c) => norm(c) === cityLower);
      if (hit) return zone;
    }
  }

  return defaultZone;
}

export function pickZoneByCity(zones, city) {
  return pickShippingZone(zones, "", city);
}

/** Match zone by province (provinces[] from admin). */
export function pickShippingZoneByProvince(zones, province, city = "") {
  if (!Array.isArray(zones) || !zones.length) return null;
  const selected = String(province || "").trim();
  const ordered = [...zones]
    .filter((z) => z?.status !== "inactive")
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const defaultZone = ordered.find((z) => z?.isDefault) || null;

  if (!selected) return defaultZone;

  for (const zone of ordered) {
    if (zone?.isDefault) continue;
    const list = zone.provinces;
    if (Array.isArray(list) && list.length > 0 && list.some((p) => String(p).trim() === selected)) {
      return zone;
    }
  }

  return defaultZone;
}

function getZoneFlatRate(zone) {
  if (!zone) return FLAT_FEE;
  if (zone.rate != null && zone.rate !== "" && Number.isFinite(Number(zone.rate))) {
    return Math.max(FLAT_FEE, Number(zone.rate) || 0);
  }
  const ranges = Array.isArray(zone.weightRanges) ? zone.weightRanges : [];
  if (ranges.length) {
    const sorted = [...ranges].sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0));
    return Math.max(FLAT_FEE, Number(sorted[0]?.price) || 0);
  }
  return FLAT_FEE;
}

/** @deprecated Always 0 — store does not offer free delivery. */
export function getZoneFreeThreshold() {
  return 0;
}

export function getZoneEstimatedDays(zone, fallback = "2-5 business days") {
  if (!zone) return fallback;
  const explicit = String(zone.estimatedDays || zone.description || "").trim();
  if (explicit) return explicit;
  const name = norm(zone.name || "");
  if (name.includes("major")) return "2-3 business days";
  if (name.includes("remote")) return "4-7 business days";
  if (name.includes("other")) return "2-5 business days";
  return fallback;
}

const STANDARD_SHIPPING = {
  name: "Standard Shipping",
  rate: FLAT_FEE,
  estimatedDays: "4-7 business days",
};

function noFreeFields() {
  return {
    isFree: false,
    freeShippingThreshold: 0,
    freeShippingEnabled: false,
    freeShippingNote: "",
    showFreeShippingProgress: false,
    freeApplied: false,
  };
}

export function quoteShippingByProvince(zones, province, city, weightGrams, orderSubtotal = 0) {
  void orderSubtotal;
  const zone = pickShippingZoneByProvince(zones, province, city);
  const useStandard = !zone;
  const zoneName = useStandard ? STANDARD_SHIPPING.name : zone.name || STANDARD_SHIPPING.name;
  const baseRate = useStandard ? STANDARD_SHIPPING.rate : getZoneFlatRate(zone);
  const estimatedDays = useStandard ? STANDARD_SHIPPING.estimatedDays : getZoneEstimatedDays(zone);
  const shippingCost = Math.max(FLAT_FEE, baseRate);

  return {
    success: true,
    zoneName,
    zone: zoneName,
    zoneId: zone?._id || null,
    rate: shippingCost,
    shippingCost,
    originalCost: shippingCost,
    estimatedDays,
    province: String(province || "").trim(),
    city: String(city || "").trim(),
    weight: weightGrams,
    note: useStandard ? "standard_fallback" : "province_zone",
    isDefault: Boolean(zone?.isDefault),
    ...noFreeFields(),
  };
}

function weightBasedCost(zone, weightGrams) {
  const sorted = [...zone.weightRanges].sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0));
  const weight = Math.max(0, Number(weightGrams) || 0);
  const weightRange = sorted.find((r) => weight >= (r.minWeight || 0) && weight <= (r.maxWeight || 0));
  if (!weightRange) {
    const highest = [...sorted].sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0))[0];
    return {
      originalCost: Math.max(FLAT_FEE, Number(highest?.price) || 0),
      weightRange: highest || null,
      note: "highest_tier",
    };
  }
  return {
    originalCost: Math.max(FLAT_FEE, Number(weightRange.price) || 0),
    weightRange,
    note: null,
  };
}

export function computeShippingForZone(zone, weightGrams, orderSubtotal = 0) {
  void orderSubtotal;
  if (!zone || !Array.isArray(zone.weightRanges) || !zone.weightRanges.length) {
    return {
      shippingCost: FLAT_FEE,
      originalCost: FLAT_FEE,
      weightRange: null,
      note: "flat_policy",
      ...noFreeFields(),
    };
  }

  const { originalCost, weightRange, note: weightNote } = weightBasedCost(zone, weightGrams);
  const shippingCost = Math.max(FLAT_FEE, originalCost);

  return {
    shippingCost,
    originalCost: shippingCost,
    weightRange,
    note: weightNote || undefined,
    ...noFreeFields(),
  };
}

export function quoteShipping(zones, country, city, weightGrams, orderSubtotal = 0, province = "") {
  if (String(province || "").trim()) {
    return quoteShippingByProvince(zones, province, city, weightGrams, orderSubtotal);
  }

  const zone = pickShippingZone(zones, country, city);
  if (!zone) {
    return {
      success: true,
      zoneName: STANDARD_SHIPPING.name,
      zone: STANDARD_SHIPPING.name,
      zoneId: null,
      rate: STANDARD_SHIPPING.rate,
      shippingCost: STANDARD_SHIPPING.rate,
      originalCost: STANDARD_SHIPPING.rate,
      estimatedDays: STANDARD_SHIPPING.estimatedDays,
      weight: weightGrams,
      weightRange: null,
      country,
      city,
      note: "no_zone_configured",
      isDefault: false,
      ...noFreeFields(),
    };
  }

  const r = computeShippingForZone(zone, weightGrams, orderSubtotal);
  return {
    success: true,
    zoneName: zone.name || "",
    zone: zone.name || "",
    zoneId: zone._id,
    rate: r.shippingCost,
    shippingCost: r.shippingCost,
    originalCost: r.originalCost,
    estimatedDays: getZoneEstimatedDays(zone),
    weight: weightGrams,
    weightRange: r.weightRange
      ? {
          min: r.weightRange.minWeight,
          max: r.weightRange.maxWeight,
          price: r.weightRange.price,
        }
      : null,
    country,
    city,
    note: r.note,
    isDefault: Boolean(zone.isDefault),
    ...noFreeFields(),
  };
}
