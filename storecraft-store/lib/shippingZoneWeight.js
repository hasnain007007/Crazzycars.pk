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
  if (!zone) return 150;
  if (zone.rate != null && zone.rate !== "" && Number.isFinite(Number(zone.rate))) {
    return Math.max(0, Number(zone.rate));
  }
  const ranges = Array.isArray(zone.weightRanges) ? zone.weightRanges : [];
  if (ranges.length) {
    const sorted = [...ranges].sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0));
    return Math.max(0, Number(sorted[0]?.price) || 0);
  }
  return 150;
}

export function getZoneFreeThreshold(zone) {
  if (!zone) return 0;
  const fs = zone.freeShipping && typeof zone.freeShipping === "object" ? zone.freeShipping : null;
  if (fs?.enabled) return Math.max(0, Number(fs.threshold) || 0);
  return Math.max(0, Number(zone.freeShippingThreshold) || 0);
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
  rate: 150,
  estimatedDays: "4-7 business days",
  freeShippingThreshold: 2999,
};

export function quoteShippingByProvince(zones, province, city, weightGrams, orderSubtotal = 0) {
  const order = Math.round(Math.max(0, Number(orderSubtotal) || 0) * 100) / 100;
  const zone = pickShippingZoneByProvince(zones, province, city);
  const useStandard = !zone;
  const zoneName = useStandard ? STANDARD_SHIPPING.name : zone.name || STANDARD_SHIPPING.name;
  const baseRate = useStandard ? STANDARD_SHIPPING.rate : getZoneFlatRate(zone);
  const threshold = useStandard ? STANDARD_SHIPPING.freeShippingThreshold : getZoneFreeThreshold(zone);
  const estimatedDays = useStandard ? STANDARD_SHIPPING.estimatedDays : getZoneEstimatedDays(zone);
  const isFree = baseRate === 0 || (threshold > 0 && order >= threshold);
  const shippingCost = isFree ? 0 : baseRate;
  let freeShippingNote = "";
  if (threshold > 0 && !isFree) {
    freeShippingNote = `Add Rs. ${Math.round(threshold - order).toLocaleString("en-GB")} more for free delivery`;
  } else if (isFree && threshold > 0) {
    freeShippingNote = `Free delivery on orders over Rs. ${Math.round(threshold).toLocaleString("en-GB")}`;
  } else if (isFree) {
    freeShippingNote = "Free delivery";
  }

  return {
    success: true,
    zoneName,
    zone: zoneName,
    zoneId: zone?._id || null,
    rate: baseRate,
    shippingCost,
    originalCost: baseRate,
    isFree,
    estimatedDays,
    province: String(province || "").trim(),
    city: String(city || "").trim(),
    weight: weightGrams,
    freeShippingThreshold: !isFree && threshold > 0 ? threshold : 0,
    freeShippingEnabled: threshold > 0,
    freeShippingNote,
    showFreeShippingProgress: threshold > 0 && !isFree,
    note: useStandard ? "standard_fallback" : "province_zone",
    isDefault: Boolean(zone?.isDefault),
  };
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
      freeShippingNote = `Free shipping on orders over Rs. ${Math.round(fsThreshold).toLocaleString("en-GB")}`;
    } else {
      freeShippingNote = `Add Rs. ${Math.round(fsThreshold - order).toLocaleString("en-GB")} more for free shipping`;
    }
  }

  if (!isFree && legacyT > 0 && order >= legacyT) {
    isFree = true;
    freeApplied = true;
    freeShippingNote = `Free shipping on orders over Rs. ${Math.round(legacyT).toLocaleString("en-GB")}`;
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
      isFree: false,
      estimatedDays: STANDARD_SHIPPING.estimatedDays,
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
    zone: zone.name || "",
    zoneId: zone._id,
    rate: r.shippingCost,
    shippingCost: r.shippingCost,
    originalCost: r.originalCost,
    isFree: r.isFree,
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
    freeShippingThreshold: r.freeShippingThreshold,
    freeShippingEnabled: r.freeShippingEnabled,
    freeShippingNote: r.freeShippingNote,
    showFreeShippingProgress: r.showFreeShippingProgress,
    note: r.note,
    isDefault: Boolean(zone.isDefault),
  };
}
