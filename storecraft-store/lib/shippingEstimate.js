export function toKg(value, unit = "kg") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = String(unit || "kg").toLowerCase();
  if (u === "g") return n / 1000;
  if (u === "lb") return n * 0.45359237;
  if (u === "oz") return n * 0.0283495231;
  return n;
}

export function fromKg(valueKg, unit = "kg") {
  const n = Number(valueKg);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = String(unit || "kg").toLowerCase();
  if (u === "g") return n * 1000;
  if (u === "lb") return n / 0.45359237;
  if (u === "oz") return n / 0.0283495231;
  return n;
}

export function pickZoneByCountry(zones, countryCode) {
  if (!Array.isArray(zones) || !zones.length) return null;
  const c = String(countryCode || "").trim().toUpperCase();
  if (!c) return zones[0];
  const exact = zones.find((z) => Array.isArray(z.countries) && z.countries.includes(c));
  return exact || zones[0];
}

export function computeRatePrice({ rate, totalWeightKg, orderTotal = 0, surcharge = 0 }) {
  const safeRate = rate || {};
  const freeOver = Math.max(0, Number(safeRate.freeShippingOver) || 0);
  if (freeOver > 0 && Number(orderTotal) >= freeOver) return 0;
  const base = Math.max(0, Number(safeRate.price) || 0);
  const included = Math.max(0, Number(safeRate.baseWeightIncluded) || 0);
  const perKg = Math.max(0, Number(safeRate.pricePerKg) || 0);
  const extraWeight = Math.max(0, Number(totalWeightKg) - included);
  return Math.max(0, base + extraWeight * perKg + Math.max(0, Number(surcharge) || 0));
}

export function estimateRates({ zone, totalWeightKg, orderTotal = 0, surcharge = 0 }) {
  const rates = Array.isArray(zone?.rates) ? zone.rates : [];
  return rates.map((rate) => {
    const price = computeRatePrice({ rate, totalWeightKg, orderTotal, surcharge });
    return {
      name: rate.name || "Standard",
      price: Math.round(price * 100) / 100,
      days:
        Number(rate.minDays) > 0 || Number(rate.maxDays) > 0
          ? `${Math.max(0, Number(rate.minDays) || 0)}-${Math.max(0, Number(rate.maxDays) || 0)}`
          : "",
    };
  });
}
