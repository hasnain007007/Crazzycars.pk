/**
 * Merchant listing JSON-LD helpers — keep aligned with STORE_POLICY.
 */
import { STORE_POLICY } from "../../config/store-policy.js";

/**
 * Two-path return policy: full refund for defective/wrong item; exchange for change of mind.
 * @param {string} siteUrl
 */
export function buildMerchantReturnPolicies(siteUrl) {
  const site = String(siteUrl || "").replace(/\/+$/, "");
  const days = STORE_POLICY.returns.windowDays;
  const link = site ? `${site}/returns-policy` : undefined;
  const base = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "PK",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: days,
    returnMethod: "https://schema.org/ReturnByMail",
    merchantReturnLink: link,
  };

  return [
    {
      ...base,
      name: "Defective or wrong item shipped",
      refundType: "https://schema.org/FullRefund",
      returnFees: "https://schema.org/FreeReturn",
      itemDefectReturnFees: "https://schema.org/FreeReturn",
    },
    {
      ...base,
      name: "Change of mind",
      refundType: "https://schema.org/ExchangeRefund",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    },
  ];
}

/** Flat nationwide delivery from STORE_POLICY. Omits unconfirmed city transit times. */
export function buildOfferShippingDetails() {
  const fee = Number(STORE_POLICY.shipping.standardFeePKR) || 0;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: fee.toFixed(2),
      currency: "PKR",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "PK",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 2,
        unitCode: "DAY",
      },
    },
  };
}
