/**
 * Normalize product variation option rows (string legacy or object).
 */

const WEIGHT_UNITS = new Set(["kg", "g", "lb", "oz"]);

export function normalizeWeightUnit(input, fallback = "g") {
  const u = String(input || "").trim().toLowerCase();
  return WEIGHT_UNITS.has(u) ? u : fallback;
}

/** @returns {number|undefined} undefined = inherit product inventory */
function normalizeOptionStockField(o) {
  if (!o || typeof o !== "object") return undefined;
  if (!("stock" in o)) return undefined;
  if (o.stock === "" || o.stock == null) return undefined;
  const n = Number(o.stock);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, n);
}

/**
 * @returns {{
 *   value: string,
 *   additionalPrice: number,
 *   weight: number,
 *   weightUnit: string,
 *   additionalShippingWeight: number,
 *   shippingWeightUnit: string,
 *   shippingPriceSurcharge: number,
 *   sku: string,
 *   stock?: number
 * } | null}
 */
export function normalizeVariationOptionEntry(o) {
  if (typeof o === "string") {
    const value = String(o || "").trim();
    if (!value) return null;
    return {
      value,
      additionalPrice: 0,
      weight: 0,
      weightUnit: "g",
      additionalShippingWeight: 0,
      shippingWeightUnit: "g",
      shippingPriceSurcharge: 0,
      sku: "",
    };
  }
  if (!o || typeof o !== "object") return null;
  const value = String(o.value ?? o.label ?? "").trim();
  if (!value) return null;
  const wu = normalizeWeightUnit(o.weightUnit, "g");
  const row = {
    value,
    additionalPrice: Number(o.additionalPrice) || 0,
    weight: Math.max(0, Number(o.weight) || 0),
    weightUnit: wu,
    additionalShippingWeight: Math.max(0, Number(o.additionalShippingWeight) || 0),
    shippingWeightUnit: normalizeWeightUnit(o.shippingWeightUnit ?? o.weightUnit, wu),
    shippingPriceSurcharge: Math.max(0, Number(o.shippingPriceSurcharge) || 0),
    sku: String(o.sku || "").trim(),
  };
  const st = normalizeOptionStockField(o);
  if (st !== undefined) row.stock = st;
  return row;
}

export function serializeStoreOption(o) {
  return normalizeVariationOptionEntry(o);
}

export function optionLegacySpread(variation) {
  const legacyExtra = Number(variation?.additionalPrice ?? variation?.extraPrice) || 0;
  const legacyShip = Math.max(0, Number(variation?.additionalShippingWeight) || 0);
  const legacyShipUnit = normalizeWeightUnit(variation?.shippingWeightUnit ?? variation?.weightUnit, "g");
  const legacySur = Math.max(0, Number(variation?.shippingPriceSurcharge) || 0);
  const legacyW = Math.max(0, Number(variation?.weight) || 0);
  const legacyWUnit = normalizeWeightUnit(variation?.weightUnit, "g");
  const legacyStock = Math.max(0, Number(variation?.quantity ?? variation?.stock) || 0);
  return {
    legacyExtra,
    legacyShip,
    legacyShipUnit,
    legacySur,
    legacyW,
    legacyWUnit,
    legacyStock,
  };
}
