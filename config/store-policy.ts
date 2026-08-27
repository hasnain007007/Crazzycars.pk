/**
 * Confirmed store policy — shipping & returns + contact.
 *
 * Runtime mirror (Next.js): `storecraft-store/config/store-policy.js`
 * Keep both files aligned when values change.
 */

/** Homefy.pk — keep aligned with `storecraft-store/config/store-policy.js`. */
export const STORE_CONTACT = {
  phone: "[FILL IN]",
  phoneE164: "",
  whatsapp: "",
  email: "support@homefy.pk",
  address: {
    city: "[FILL IN — city, Pakistan]",
    region: "Pakistan",
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
