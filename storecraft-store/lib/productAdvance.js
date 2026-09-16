/**
 * Per-product % advance payment helpers + COD shipping advance.
 *
 * COD advance rule (v1):
 *   amount = MAX(sum of line % advances, shippingCost)
 *   Not stacked. Whichever is higher wins.
 *   Product % advance does not add on top of shipping advance.
 */
import { roundRupees } from "@/lib/currency";

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
    const lineTotal = roundRupees(unit * qty);
    const lineAdvance = roundRupees((lineTotal * percent) / 100);
    if (lineAdvance <= 0) continue;
    amount += lineAdvance;
    maxPercent = Math.max(maxPercent, percent);
    lines.push({
      name: String(item.name || "Item").trim() || "Item",
      percent,
      amount: lineAdvance,
    });
  }
  amount = roundRupees(amount);
  return { amount, maxPercent, lines };
}

/**
 * COD advance to collect before shipping.
 * Uses the higher of product-% advance vs shipping charge (not stacked).
 */
export function computeCodAdvanceDue({
  items,
  paymentMethod,
  shippingCost,
  storeAdvanceAmount,
  advanceMessageEnabled = true,
}) {
  void storeAdvanceAmount; // legacy settings flat — shippingCost is source of truth
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
  const ship = Math.max(0, Number(shippingCost) || 0);
  const shippingAdvance =
    advanceMessageEnabled !== false && ship > 0 ? roundRupees(ship) : 0;
  const amount = Math.max(product.amount, shippingAdvance);
  if (amount <= 0) {
    return {
      amount: 0,
      mode: "none",
      maxPercent: product.maxPercent,
      lines: product.lines,
    };
  }
  // Prefer percent mode when product % is the winning (or equal and > 0) amount.
  if (product.amount > 0 && product.amount >= shippingAdvance) {
    return {
      amount,
      mode: "percent",
      maxPercent: product.maxPercent,
      lines: product.lines,
    };
  }
  return {
    amount,
    mode: "delivery",
    maxPercent: product.maxPercent,
    lines: product.lines,
  };
}
