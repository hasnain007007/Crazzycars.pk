/**
 * Merchant listing JSON-LD helpers — keep aligned with STORE_POLICY.
 */
import { STORE_POLICY } from "../../config/store-policy.js";
import { shippingFeePkr } from "../shippingFee.js";

/**
 * Organization-level return policy (defective / wrong-item only).
 * Do NOT put generic returnFees: FreeReturn — Google reads that as any-reason free returns.
 * Prefer configuring Search Console / Merchant Center as the authoritative policy UI.
 * @param {string} siteUrl
 */
export function buildOrganizationReturnPolicy(siteUrl) {
  const site = String(siteUrl || "").replace(/\/+$/, "");
  const days = STORE_POLICY.returns.windowDays;
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "PK",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: days,
    itemCondition: "https://schema.org/DamagedCondition",
    returnMethod: "https://schema.org/ReturnByMail",
    itemDefectReturnFees: "https://schema.org/FreeReturn",
    refundType: "https://schema.org/FullRefund",
    merchantReturnLink: site ? `${site}/returns-policy` : undefined,
  };
}

/**
 * @deprecated Prefer buildOrganizationReturnPolicy at Organization level.
 * Kept for callers that still expect an array; returns a single policy without
 * generic returnFees: FreeReturn.
 */
export function buildMerchantReturnPolicies(siteUrl) {
  return [buildOrganizationReturnPolicy(siteUrl)];
}

/**
 * Offer shipping details — fee from product.isBulky / body-kit.
 * @param {object} [product]
 */
export function buildOfferShippingDetails(product) {
  const fee = shippingFeePkr(product);
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: Number(fee).toFixed(2),
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
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 5,
        unitCode: "DAY",
      },
    },
  };
}
