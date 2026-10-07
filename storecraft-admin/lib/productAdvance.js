/**
 * Keep in sync with storecraft-store/lib/productAdvance.js
 *
 * Per-product % advance helpers + COD advance (legacy shipping vs booking policy).
 *
 * Legacy (v1, advanceMode delivery|percent):
 *   amount = MAX(sum of line % advances, shippingCost) — not stacked.
 *
 * Booking (v2, advanceMode booking) when COD_ADVANCE_REQUIRED:
 *   amount = min(orderTotal, max(COD_ADVANCE_AMOUNT, product % advance))
 */
import { roundRupees } from "@/lib/currency";
import {
  COD_ADVANCE_AMOUNT,
  COD_ADVANCE_POLICY_VERSION,
  COD_ADVANCE_REQUIRED,
} from "@/config/checkout-money";

export function normalizeAdvancePercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * @param {Array<{ name?: string, unitPrice?: number, price?: number, quantity?: number, advancePercentRequired?: number }>} items
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

function computeLegacyCodAdvanceDue({
  product,
  shippingCost,
  advanceMessageEnabled = true,
}) {
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
      policyVersion: 1,
    };
  }
  if (product.amount > 0 && product.amount >= shippingAdvance) {
    return {
      amount,
      mode: "percent",
      maxPercent: product.maxPercent,
      lines: product.lines,
      policyVersion: 1,
    };
  }
  return {
    amount,
    mode: "delivery",
    maxPercent: product.maxPercent,
    lines: product.lines,
    policyVersion: 1,
  };
}

/**
 * COD advance to collect before dispatch.
 * @param {object} opts
 * @param {number|null} [opts.orderTotal] — grand total (goods + shipping − discounts); used to cap booking advance
 * @param {boolean} [opts.bookingEnabled] — default COD_ADVANCE_REQUIRED
 * @param {number} [opts.bookingAmount] — default COD_ADVANCE_AMOUNT
 */
export function computeCodAdvanceDue({
  items,
  paymentMethod,
  shippingCost,
  storeAdvanceAmount,
  advanceMessageEnabled = true,
  orderTotal = null,
  bookingEnabled = COD_ADVANCE_REQUIRED,
  bookingAmount = COD_ADVANCE_AMOUNT,
}) {
  void storeAdvanceAmount;
  const pm = String(paymentMethod || "cod").toLowerCase();
  const product = computeProductAdvanceRequired(items);
  if (pm !== "cod") {
    return {
      amount: 0,
      mode: "none",
      maxPercent: product.maxPercent,
      lines: product.lines,
      policyVersion: 0,
    };
  }

  if (bookingEnabled) {
    const flat = Math.max(0, roundRupees(bookingAmount));
    const raw = Math.max(flat, product.amount);
    let amount = raw;
    if (orderTotal != null && Number.isFinite(Number(orderTotal))) {
      const total = Math.max(0, roundRupees(orderTotal));
      amount = Math.min(total, raw);
    }
    amount = roundRupees(amount);
    if (amount <= 0) {
      return {
        amount: 0,
        mode: "none",
        maxPercent: product.maxPercent,
        lines: product.lines,
        policyVersion: COD_ADVANCE_POLICY_VERSION,
      };
    }
    return {
      amount,
      mode: "booking",
      maxPercent: product.maxPercent,
      lines: product.lines,
      policyVersion: COD_ADVANCE_POLICY_VERSION,
    };
  }

  return computeLegacyCodAdvanceDue({
    product,
    shippingCost,
    advanceMessageEnabled,
  });
}
