/**
 * Per-product % advance payment helpers (e.g. "pay at least 50% advance").
 */

export function normalizeAdvancePercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * @param {Array<{ name?: string, unitPrice?: number, price?: number, quantity?: number, advancePercentRequired?: number }>} items
 * @returns {{ amount: number, maxPercent: number, lines: Array<{ name: string, percent: number, amount: number }> }}
 */
export function computeProductAdvanceRequired(items) {
  const lines = [];
  let amount = 0;
  let maxPercent = 0;
  for (const item of items || []) {
    const percent = normalizeAdvancePercent(item?.advancePercentRequired);
    if (percent <= 0) continue;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unit = Number(item.unitPrice ?? item.price) || 0;
    const lineTotal = Math.round(unit * qty * 100) / 100;
    const lineAdvance = Math.round((lineTotal * percent) / 100);
    if (lineAdvance <= 0) continue;
    amount += lineAdvance;
    maxPercent = Math.max(maxPercent, percent);
    lines.push({
      name: String(item.name || "Item").trim() || "Item",
      percent,
      amount: lineAdvance,
    });
  }
  amount = Math.round(amount * 100) / 100;
  return { amount, maxPercent, lines };
}

/**
 * COD advance to collect before shipping:
 * - If any product requires %, use that sum (goods advance).
 * - Else fall back to store flat delivery advance when shipping applies.
 */
export function computeCodAdvanceDue({
  items,
  paymentMethod,
  shippingCost,
  storeAdvanceAmount,
  advanceMessageEnabled = true,
}) {
  const pm = String(paymentMethod || "cod").toLowerCase();
  const product = computeProductAdvanceRequired(items);
  if (pm !== "cod") {
    return {
      amount: 0,
      mode: "none",
      maxPercent: product.maxPercent,
      lines: product.lines,
    };
  }
  if (product.amount > 0) {
    return {
      amount: product.amount,
      mode: "percent",
      maxPercent: product.maxPercent,
      lines: product.lines,
    };
  }
  const ship = Math.max(0, Number(shippingCost) || 0);
  const flat = Math.max(0, Number(storeAdvanceAmount) || 0);
  if (advanceMessageEnabled && ship > 0 && flat > 0) {
    return {
      amount: flat,
      mode: "delivery",
      maxPercent: 0,
      lines: [],
    };
  }
  return { amount: 0, mode: "none", maxPercent: 0, lines: [] };
}
