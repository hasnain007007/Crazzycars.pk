/**
 * Merchant listing JSON-LD helpers — keep aligned with STORE_POLICY.
 */
import { STORE_POLICY } from "../../config/store-policy.js";

/**
 * Merchant return policy JSON-LD from STORE_POLICY.
 * Defective / wrong-item only when change of mind is not eligible.
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

  const policies = [
    {
      ...base,
      name: "Defective or wrong item shipped",
      refundType: "https://schema.org/FullRefund",
      returnFees: "https://schema.org/FreeReturn",
      itemDefectReturnFees: "https://schema.org/FreeReturn",
    },
  ];

  if (STORE_POLICY.returns.changeOfMindEligible && STORE_POLICY.returns.changeOfMindRemedy === "exchange-only") {
    policies.push({
      ...base,
      name: "Change of mind",
      refundType: "https://schema.org/ExchangeRefund",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    });
  }

  return policies;
}

/** Flat nationwide delivery from STORE_POLICY (COD Pakistan). */
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
      // Nationwide courier transit after dispatch (PKT business days).
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 5,
        unitCode: "DAY",
      },
    },
  };
}
