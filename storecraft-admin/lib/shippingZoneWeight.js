/**
 * Country / city + weight (grams) shipping for ShippingZone documents.
 * Store policy: no free delivery — never waive shipping for order value.
 */

const FLAT_FEE = 250;

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

export function quoteShipping(zones, country, city, weightGrams, orderSubtotal = 0) {
  const zone = pickShippingZone(zones, country, city);
  if (!zone) {
    return {
      success: true,
      zoneName: "Standard Shipping",
      zoneId: null,
      shippingCost: FLAT_FEE,
      originalCost: FLAT_FEE,
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
    zoneId: zone._id,
    shippingCost: r.shippingCost,
    originalCost: r.originalCost,
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
