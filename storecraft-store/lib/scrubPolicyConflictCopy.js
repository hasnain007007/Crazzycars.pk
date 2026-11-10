/**
 * Render-time scrubbers for stored CMS/blog/product HTML that still contradicts
 * STORE_POLICY / checkout-money (fees, COD tiers, returns, body kits).
 * Prefer updating Mongo via migrations; these guards keep live pages consistent
 * until content is applied.
 */
import { STORE_POLICY } from "../config/store-policy.js";
import {
  COD_ADVANCE_TIERS,
  PREPAID_DISCOUNT_PERCENT,
} from "../config/checkout-money.js";
import {
  advanceFitmentFaqAnswer,
  codAdvanceTierSummary,
  deliveryFeeOnlyStatement,
  returnsPolicyCanonical,
  standardDeliveryFeeStatement,
} from "./storePolicyCopy.js";

const REGULAR = STORE_POLICY.shipping.standardFeePKR;
const BULKY = STORE_POLICY.shipping.bulkyFeePKR;
const DAYS = STORE_POLICY.returns.windowDays;

function pkr(n) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

/** COD tier list HTML matching published policy (10,000 → Rs. 1,000). */
function codTierListHtml() {
  const [a, b, c] = COD_ADVANCE_TIERS;
  return [
    `<li>Orders under ${pkr(a.below)} — advance <strong>${pkr(a.amount)}</strong></li>`,
    `<li>Orders ${pkr(a.below)}–${pkr(b.below - 1)} — advance <strong>${pkr(b.amount)}</strong></li>`,
    `<li>Orders ${pkr(b.below)} and above — advance <strong>${pkr(c.amount)}</strong></li>`,
  ].join("\n");
}

/**
 * Strip / rewrite known policy-conflict phrases in blog or CMS HTML.
 */
export function scrubPolicyConflictHtml(html) {
  let out = String(html || "");
  if (!out) return out;

  // Flat Rs. 250 on every order (ignores bulky tier)
  out = out.replace(
    /flat\s+(?:delivery\s+)?(?:fee\s+of\s+)?Rs\.?\s*250\s+on every order/gi,
    `delivery of ${pkr(REGULAR)} regular, or ${pkr(BULKY)} when the order includes bulky items`
  );
  out = out.replace(
    /every\s+CrazzyCars\s+order\s+ships\s+for\s+a\s+flat\s+<strong>Rs\.?\s*250\s+delivery fee<\/strong>/gi,
    `CrazzyCars delivery is <strong>${pkr(REGULAR)} regular</strong>, or <strong>${pkr(BULKY)}</strong> when the order includes bulky items`
  );
  out = out.replace(
    /Standard delivery is a flat Rs\.?\s*250 on every order\./gi,
    `Standard delivery is ${pkr(REGULAR)} for regular items, or ${pkr(BULKY)} when the order includes bulky items.`
  );
  out = out.replace(
    /Rs\.?\s*250 regular, or Rs\.?\s*250 when the order includes bulky items/gi,
    `${pkr(REGULAR)} regular, or ${pkr(BULKY)} when the order includes bulky items`
  );
  out = out.replace(
    /No\.\s*Delivery is a flat Rs\.?\s*250 on every order\s*[—–-]?\s*no waiver threshold exists\./gi,
    `No. Delivery is ${pkr(REGULAR)} regular or ${pkr(BULKY)} with bulky items — there is no order-value waiver.`
  );

  // Delivery paid in advance / in addition to booking (checkout includes shipping in totals)
  out = out.replace(
    /Delivery is paid in advance[^.]*\./gi,
    "Delivery is included in the amount shown at checkout (with your booking advance when you choose COD)."
  );
  out = out.replace(
    /The delivery charge \(Rs\.?\s*250\) is always prepaid[^.]*\./gi,
    `Delivery (${pkr(REGULAR)} regular / ${pkr(BULKY)} bulky) is part of the checkout total — pay the booking advance shown for COD, or the full total when you pay in advance.`
  );
  out = out.replace(
    /Pay Rs\.?\s*250 delivery \+ applicable COD advance in advance\./gi,
    `Pay the booking advance shown at checkout (delivery is included in your order total).`
  );
  out = out.replace(
    /Delivery Rs\.?\s*250 is charged separately and in addition to the above\./gi,
    `Delivery (${pkr(REGULAR)} / ${pkr(BULKY)} bulky) is part of the order total shown at checkout — not an extra fee on top of the booking advance.`
  );

  // Wrong COD tier boundary: "5,000–10,000 → 600" and "above 10,000 → 1,000"
  out = out.replace(
    /Orders Rs\.?\s*5,?000\s*[–—-]\s*10,?000\s*[—–-]\s*advance\s*<strong>Rs\.?\s*600<\/strong>/gi,
    `Orders ${pkr(5000)}–${pkr(9999)} — advance <strong>${pkr(600)}</strong>`
  );
  out = out.replace(
    /Orders above Rs\.?\s*10,?000\s*[—–-]\s*advance\s*<strong>Rs\.?\s*1,?000<\/strong>/gi,
    `Orders ${pkr(10000)} and above — advance <strong>${pkr(1000)}</strong>`
  );

  // Change-of-mind = exchange only (forbidden by STORE_POLICY)
  out = out.replace(
    /Change-of-mind\s*=\s*exchange only/gi,
    "Change of mind is not eligible for return, refund, or exchange"
  );
  out = out.replace(
    /Change of mind \([^)]+\)\s*=\s*<strong>exchange only<\/strong>,\s*not a cash refund/gi,
    "Change of mind (right item, wrong colour or style choice) is <strong>not eligible</strong> for return, refund, or exchange"
  );
  out = out.replace(
    /No\.\s*Change-of-mind returns are exchange-only for a different product or size\./gi,
    `No. ${returnsPolicyCanonical()}`
  );
  out = out.replace(
    /We can offer an exchange but not a full refund\./gi,
    "Buyer fitment mistakes are not eligible for exchange or refund unless we listed the wrong vehicle."
  );
  out = out.replace(
    /Buyer covers shipping for change-of-mind exchanges\./gi,
    "Change-of-mind exchanges are not offered."
  );
  out = out.replace(
    /<h2>Change-of-mind exchange process<\/h2>[\s\S]*?(?=<h2>|$)/i,
    `<h2>Change of mind</h2><p>${returnsPolicyCanonical()} Confirm fitment on the product page or WhatsApp before you order.</p>`
  );

  // Unconditional fitment refund promises
  out = out.replace(
    /(?:it is |your advance is )?deducted from your total and (?:fully )?refunded if the item doesn['’]?t fit/gi,
    "deducted from your total"
  );
  out = out.replace(
    /Your advance is refunded if the item doesn['’]?t fit[^.]*\./gi,
    `${advanceFitmentFaqAnswer()}`
  );

  // Stale "from Rs. 250" booking copy
  out = out.replace(
    /booking advance \(from Rs\.?\s*250\)/gi,
    `booking advance (from ${pkr(COD_ADVANCE_TIERS[0].amount)})`
  );
  out = out.replace(
    /from Rs\.?\s*250, or more if the product requires/gi,
    `from ${pkr(COD_ADVANCE_TIERS[0].amount)}, or more if the product requires`
  );

  return out;
}

/** Meta / excerpt scrub for policy blogs. */
export function scrubPolicyConflictPlain(text) {
  let out = String(text || "");
  if (!out) return out;
  out = out.replace(
    /flat Rs\.?\s*250 on every order(?:, paid in advance)?/gi,
    `${deliveryFeeOnlyStatement().replace(/\.$/, "")}`
  );
  out = out.replace(
    /Change-of-mind\s*=\s*exchange only/gi,
    "no change-of-mind returns or exchanges"
  );
  out = out.replace(
    /paid in advance\.?\s*COD available/gi,
    `shown at checkout. COD available`
  );
  return out;
}

/** Remove stale SEO uniqueness boilerplate that references missing "fitment fields". */
export function scrubStaleProductBoilerplate(html) {
  let out = String(html || "");
  if (!out) return out;
  out = out.replace(
    /<div[^>]*data-cc-unique[^>]*>[\s\S]*?<\/div>/gi,
    ""
  );
  out = out.replace(
    /<p>\s*CrazzyCars listing\s*[—–-]\s*[^<]+<\/p>/gi,
    ""
  );
  out = out.replace(
    /<p>\s*Use the fitment fields on this page to match your car\.+\s*<\/p>/gi,
    ""
  );
  out = out.replace(
    /Use the fitment fields on this page to match your car\.+/gi,
    "Use the vehicle compatibility table on this page to match your car."
  );
  // Abrupt truncated booking-advance teaser sentences
  out = out.replace(
    /A Rs\.?\s*300\s*\/\s*600\s*\/\s*1,?000 booking advance(?![^.]*deducted)[^.]*$/gim,
    `A ${codAdvanceTierSummary()} booking advance is deducted from your COD total.`
  );
  return out;
}

export function policyBlogCanonicalMeta(slug) {
  if (slug === "delivery-charges-regular-vs-bulky-pakistan") {
    return {
      title: "Delivery Charges: Regular vs Bulky | CrazzyCars",
      // Keep ≤160 characters (C4). Tier detail lives in the article body.
      metaDescription: `CrazzyCars delivery: ${pkr(REGULAR)} regular or ${pkr(BULKY)} with bulky items. COD booking advance by order total; body kits prepaid.`,
      excerpt: `Delivery is ${pkr(REGULAR)} for regular carts and ${pkr(BULKY)} when any bulky item is in the order. COD booking advances follow order total; body kits are prepaid only.`,
    };
  }
  if (slug === "car-accessories-returns-wrong-item-pakistan") {
    return {
      title: "Returns & Wrong Item Policy | CrazzyCars",
      metaDescription: `CrazzyCars returns: ${DAYS}-day full refund for defective or wrong items only. Change of mind is not eligible. Read the plain-language guide.`,
      excerpt: `Within ${DAYS} days: full refund when an item arrives defective or we shipped the wrong item. Change of mind is not eligible for return, refund, or exchange.`,
    };
  }
  return null;
}

export {
  standardDeliveryFeeStatement,
  returnsPolicyCanonical,
  codTierListHtml,
  PREPAID_DISCOUNT_PERCENT,
};
