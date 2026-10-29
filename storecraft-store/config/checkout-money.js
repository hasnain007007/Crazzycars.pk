/**
 * Checkout money rules — single source for prepaid % and COD booking advance.
 * Live Settings may override prepaid % / advance amount; these are defaults + fallbacks.
 */
/** Fallback only when Settings.storePayment.advancePaymentDiscountPercent is missing. */
export const PREPAID_DISCOUNT_PERCENT = 4;

/**
 * COD booking advance by order total (PKR), checked in order; `below: null` = no upper limit.
 * Under 5,000 → 300 · 5,000–10,000 inclusive → 600 · over 10,000 → 1,000 (owner, Oct 2026).
 * A product's own % advance still wins when it is higher.
 * `below` is exclusive: middle tier uses 10001 so Rs. 10,000 still maps to 600.
 */
export const COD_ADVANCE_TIERS = Object.freeze([
  Object.freeze({ below: 5000, amount: 300 }),
  Object.freeze({ below: 10001, amount: 600 }),
  Object.freeze({ below: null, amount: 1000 }),
]);

/** Smallest booking advance ("from" amount in customer copy). */
export const COD_ADVANCE_AMOUNT = COD_ADVANCE_TIERS[0].amount;

/** Booking advance for a COD order total. */
export function codBookingAmountForTotal(total) {
  const t = Math.max(0, Number(total) || 0);
  for (const tier of COD_ADVANCE_TIERS) {
    if (tier.below == null || t < tier.below) return tier.amount;
  }
  return COD_ADVANCE_TIERS[COD_ADVANCE_TIERS.length - 1].amount;
}

/** When true, new COD orders use the booking-advance rule (policy version 2). */
export const COD_ADVANCE_REQUIRED = true;

/** Stored on order.payment.advancePolicyVersion for new booking-rule orders. */
export const COD_ADVANCE_POLICY_VERSION = 2;
