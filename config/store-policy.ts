/**
 * Confirmed store policy — shipping & returns + contact.
 *
 * Runtime mirror (Next.js): `storecraft-store/config/store-policy.js`
 * Keep both files aligned when values change.
 */

/** CONFIRMED by business owner 2026-08-21 — do not hardcode elsewhere. */
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
} as const;

export const STORE_POLICY = {
  contact: STORE_CONTACT,
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
       * UNCONFIRMED — no default ETA for Karachi, Islamabad, or other cities.
       * Do not invent a day range; UI must use neutral copy when this is null.
       */
      default: null,
    },
    /** CONFIRMED — COD offered on eligible orders. */
    codAvailable: true,
  },
  returns: {
    /** CONFIRMED — refund eligible reasons only. */
    eligibleReasons: ["defective", "wrong-item-shipped"] as const,
    /** CONFIRMED — change of mind is not refundable. */
    changeOfMindEligible: false,
    /** CONFIRMED — change of mind may be exchanged, not refunded. */
    changeOfMindRemedy: "exchange-only" as const,
    /** CONFIRMED — approved eligible returns receive a full refund. */
    validReturnRefundType: "full-refund" as const,
    /**
     * CONFIRMED — store pays return shipping on eligible returns; mapped to
     * schema.org FreeReturn in JSON-LD.
     */
    returnShippingPaidBy: "store" as const,
    /** CONFIRMED — finite return/exchange window (days from delivery). */
    windowDays: 7,
  },
} as const;

export type StorePolicy = typeof STORE_POLICY;
