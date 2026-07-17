/**
 * Country / city + weight (grams) shipping for ShippingZone documents.
 */

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
      originalCost: Math.max(0, Number(highest?.price) || 0),
      weightRange: highest || null,
      note: "highest_tier",
    };
  }
  return {
    originalCost: Math.max(0, Number(weightRange.price) || 0),
    weightRange,
    note: null,
  };
}

export function computeShippingForZone(zone, weightGrams, orderSubtotal = 0) {
  if (!zone || !Array.isArray(zone.weightRanges) || !zone.weightRanges.length) {
    return {
      shippingCost: 0,
      originalCost: 0,
      weightRange: null,
      note: null,
      freeApplied: false,
      isFree: false,
      freeShippingNote: "",
      freeShippingEnabled: false,
      freeShippingThreshold: 0,
      showFreeShippingProgress: false,
    };
  }

  const { originalCost, weightRange, note: weightNote } = weightBasedCost(zone, weightGrams);
  const order = Math.round(Math.max(0, Number(orderSubtotal) || 0) * 100) / 100;
  const fs = zone.freeShipping && typeof zone.freeShipping === "object" ? zone.freeShipping : null;
  const fsEnabled = Boolean(fs?.enabled);
  const fsThreshold = Math.max(0, Number(fs?.threshold) || 0);
  const legacyT = Math.max(0, Number(zone.freeShippingThreshold) || 0);

  let isFree = false;
  let freeShippingNote = "";
  let freeApplied = false;

  if (fsEnabled) {
    if (fsThreshold === 0) {
      isFree = true;
      freeApplied = true;
      freeShippingNote = "Free shipping on all orders";
    } else if (order >= fsThreshold) {
      isFree = true;
      freeApplied = true;
      freeShippingNote = `Free shipping on orders over Rs. ${Number(fsThreshold || 0).toLocaleString("en-PK")}`;
    } else {
      freeShippingNote = `Add Rs. ${Number(fsThreshold - order || 0).toLocaleString("en-PK")} more for free shipping`;
    }
  }

  if (!isFree && legacyT > 0 && order >= legacyT) {
    isFree = true;
    freeApplied = true;
    freeShippingNote = `Free shipping on orders over Rs. ${Number(legacyT || 0).toLocaleString("en-PK")}`;
  }

  const shippingCost = isFree ? 0 : originalCost;
  const progressThreshold =
    !isFree && fsEnabled && fsThreshold > 0
      ? fsThreshold
      : !isFree && !fsEnabled && legacyT > 0
        ? legacyT
        : 0;

  return {
    shippingCost,
    originalCost,
    weightRange,
    note: freeApplied ? "free_threshold" : weightNote || undefined,
    freeApplied,
    isFree,
    freeShippingNote,
    freeShippingEnabled: fsEnabled,
    freeShippingThreshold: progressThreshold,
    showFreeShippingProgress: progressThreshold > 0 && !isFree,
  };
}

export function quoteShipping(zones, country, city, weightGrams, orderSubtotal = 0) {
  const zone = pickShippingZone(zones, country, city);
  if (!zone) {
    return {
      success: true,
      zoneName: "Standard Shipping",
      zoneId: null,
      shippingCost: 0,
      originalCost: 0,
      isFree: false,
      weight: weightGrams,
      weightRange: null,
      country,
      city,
      freeShippingThreshold: 0,
      freeShippingEnabled: false,
      freeShippingNote: "",
      showFreeShippingProgress: false,
      note: "no_zone_configured",
      isDefault: false,
    };
  }

  const r = computeShippingForZone(zone, weightGrams, orderSubtotal);
  return {
    success: true,
    zoneName: zone.name || "",
    zoneId: zone._id,
    shippingCost: r.shippingCost,
    originalCost: r.originalCost,
    isFree: r.isFree,
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
    freeShippingThreshold: r.freeShippingThreshold,
    freeShippingEnabled: r.freeShippingEnabled,
    freeShippingNote: r.freeShippingNote,
    showFreeShippingProgress: r.showFreeShippingProgress,
    note: r.note,
    isDefault: Boolean(zone.isDefault),
  };
}
