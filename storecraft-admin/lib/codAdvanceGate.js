/**
 * Single gate: block dispatch / fulfillment progress when COD advance is unpaid.
 * Applies to any order with payment.advanceRequired > 0 (legacy shipping or booking).
 *
 * Call from every path that can dispatch or progress fulfillment:
 * PostEx/Run Courier create-shipment, single status change, bulk status,
 * tracking auto-ship, webhooks, track-bulk, sync-live.
 */
import { roundRupees } from "@/lib/currency";

/** Statuses that must not be set while advance is unpaid. */
export const ADVANCE_BLOCKED_FULFILLMENT_STATUSES = new Set([
  "processing",
  "packed",
  "shipped",
  "delivered",
]);

/**
 * @param {object} order
 * @returns {boolean} true when an advance is required and not yet verified
 */
export function isCodAdvanceUnpaid(order) {
  const advanceRequired = Math.max(0, Number(order?.payment?.advanceRequired) || 0);
  if (advanceRequired <= 0) return false;
  const status = String(order?.paymentStatus || "unpaid").toLowerCase();
  if (status === "paid" || status === "refunded") return false;
  // Do not fall back to payment.amount (order total) — that falsely clears the gate.
  const paid = Math.max(0, Number(order?.payment?.paidAmount) || 0);
  if (paid + 0.5 >= advanceRequired) return false;
  return true;
}

/** List/filter: awaiting advance (pending fulfillment + unpaid advance). */
export function isAwaitingCodAdvance(order) {
  if (!isCodAdvanceUnpaid(order)) return false;
  const os = String(order?.orderStatus || "pending").toLowerCase();
  if (["cancelled", "refunded", "delivered", "returned"].includes(os)) return false;
  return true;
}

/**
 * Mongo filter: pending + unpaid booking-advance orders (policy v2 / mode booking).
 * Also includes unpaid advances where paidAmount has not covered advanceRequired.
 */
export function awaitingBookingAdvanceMongoFilter() {
  return {
    orderStatus: "pending",
    paymentStatus: { $in: ["unpaid", "partial"] },
    "payment.advanceRequired": { $gt: 0 },
    $and: [
      {
        $or: [
          { "payment.advanceMode": "booking" },
          { "payment.advancePolicyVersion": 2 },
        ],
      },
      {
        $expr: {
          $lt: [{ $ifNull: ["$payment.paidAmount", 0] }, "$payment.advanceRequired"],
        },
      },
    ],
  };
}

export function advanceUnpaidErrorMessage(order, actionLabel = "continue") {
  const amt = roundRupees(Number(order?.payment?.advanceRequired) || 0);
  return `COD advance of Rs. ${amt} is unpaid. Mark "Advance received" before you ${actionLabel}.`;
}

/**
 * @param {object} order
 * @param {{ allowWithoutAdvance?: boolean }} [opts]
 *   When true (admin explicit override), unpaid COD advance does not block.
 * @returns {{ ok: true, overridden?: boolean } | { ok: false, error: string }}
 */
export function assertCodAdvanceAllowsDispatch(order, opts = {}) {
  if (!isCodAdvanceUnpaid(order)) return { ok: true };
  if (opts.allowWithoutAdvance) return { ok: true, overridden: true };
  return { ok: false, error: advanceUnpaidErrorMessage(order, "book a shipment") };
}

/**
 * @param {object} order
 * @param {string} nextStatus
 * @param {{ allowWithoutAdvance?: boolean }} [opts]
 * @returns {{ ok: true, overridden?: boolean } | { ok: false, error: string }}
 */
export function assertCodAdvanceAllowsStatus(order, nextStatus, opts = {}) {
  if (!isCodAdvanceUnpaid(order)) return { ok: true };
  const next = String(nextStatus || "").toLowerCase();
  if (!ADVANCE_BLOCKED_FULFILLMENT_STATUSES.has(next)) return { ok: true };
  if (opts.allowWithoutAdvance) return { ok: true, overridden: true };
  return { ok: false, error: advanceUnpaidErrorMessage(order, `move to ${next}`) };
}
