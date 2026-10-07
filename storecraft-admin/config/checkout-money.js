/**
 * Checkout money rules — single source for prepaid % and COD booking advance.
 * Live Settings may override prepaid % / advance amount; these are defaults + fallbacks.
 */
export const PREPAID_DISCOUNT_PERCENT = 5;

/** Flat COD booking advance (PKR) when no higher product % advance applies. */
export const COD_ADVANCE_AMOUNT = 250;

/** When true, new COD orders use the booking-advance rule (policy version 2). */
export const COD_ADVANCE_REQUIRED = true;

/** Stored on order.payment.advancePolicyVersion for new booking-rule orders. */
export const COD_ADVANCE_POLICY_VERSION = 2;
