/**
 * Runtime store policy — keep aligned with root `config/store-policy.ts`.
 *
 * Coolify builds `storecraft-store`, so this is what Next bundles at
 * `@/config/store-policy`.
 */

/**
 * Store contact — CONFIRMED by business owner 2026-08-21.
 * Single source for WhatsApp / phone; do not hardcode 03284010007 elsewhere.
 */
export const STORE_CONTACT = {
  phone: "03284010007",
  phoneE164: "+923284010007",
  whatsapp: "03284010007",
  email: "info@crazzycars.pk",
  address: {
    city: "Gujranwala",
    region: "Punjab",
    country: "PK",
  },
};

const POLICY_CORE = {
  shipping: {
    /** CONFIRMED — no order-value waiver; always charge standard fee. */
    freeDeliveryExists: false,
    freeShippingThresholdPKR: null,
    /** CONFIRMED — flat standard delivery fee (PKR). */
    standardFeePKR: 250,
    cityETAs: {
      /** CONFIRMED — Lahore only. */
      lahore: { minDays: 2, maxDays: 3 },
      /**
       * UNCONFIRMED — no default ETA for other cities.
       * UI must use neutral copy; never reuse Lahore timing as a fallback.
       */
      default: null,
    },
    /** CONFIRMED — COD offered on eligible orders. */
    codAvailable: true,
  },
  returns: {
    /** CONFIRMED */
    eligibleReasons: ["defective", "wrong-item-shipped"],
    /** CONFIRMED */
    changeOfMindEligible: false,
    /** CONFIRMED */
    changeOfMindRemedy: "exchange-only",
    /** CONFIRMED */
    validReturnRefundType: "full-refund",
    /** CONFIRMED — store pays return shipping for eligible returns. */
    returnShippingPaidBy: "store",
    /** CONFIRMED */
    windowDays: 7,
  },
};

/** Policy object; `contact` is attached for legacy `STORE_POLICY.contact` imports. */
export const STORE_POLICY = {
  ...POLICY_CORE,
  contact: STORE_CONTACT,
};
