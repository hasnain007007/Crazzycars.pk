/**
 * Shared policy layer: shipping floors, COD tiers, body-kit COD, prepaid math,
 * advance scrub, vehicle labels, blog conflict scrub.
 * Run: node --import ./tests/alias-loader.mjs --test tests/policy-consistency.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STORE_POLICY } from "../storecraft-store/config/store-policy.js";
import {
  PREPAID_DISCOUNT_PERCENT,
  codBookingAmountForTotal,
} from "../storecraft-store/config/checkout-money.js";
import {
  shippingFloorPKR,
  applyShippingFloor,
} from "../storecraft-store/lib/shippingTier.js";
import { computeAdvancePaymentDiscount } from "../storecraft-store/lib/freeDelivery.js";
import { productAllowsCod, isBodyKitProduct } from "../storecraft-store/lib/codEligibility.js";
import {
  advancePaymentCopy,
  advanceFitmentFaqAnswer,
  sanitizeAdvancePaymentMessage,
  returnsPolicyCanonical,
  codAdvanceTierSummary,
} from "../storecraft-store/lib/storePolicyCopy.js";
import {
  scrubPolicyConflictHtml,
  scrubPolicyConflictPlain,
  scrubStaleProductBoilerplate,
  policyBlogCanonicalMeta,
} from "../storecraft-store/lib/scrubPolicyConflictCopy.js";
import {
  vehicleCardModelLabel,
  isAmbiguousVehicleQualifier,
} from "../storecraft-store/lib/carCatalogDisplay.js";

describe("shipping floors", () => {
  it("regular 250 / bulky 500", () => {
    assert.equal(shippingFloorPKR(false), 250);
    assert.equal(shippingFloorPKR(true), 500);
    assert.equal(applyShippingFloor(0, false), 250);
    assert.equal(applyShippingFloor(0, true), 500);
    assert.equal(applyShippingFloor(400, false), 400);
    assert.equal(applyShippingFloor(400, true), 500);
  });
});

describe("COD booking tier boundaries", () => {
  it("4999→300, 5000→600, 9999→600, 10000→1000", () => {
    assert.equal(codBookingAmountForTotal(4999), 300);
    assert.equal(codBookingAmountForTotal(5000), 600);
    assert.equal(codBookingAmountForTotal(9999), 600);
    assert.equal(codBookingAmountForTotal(10000), 1000);
  });
});

describe("body kit COD ban", () => {
  it("blocks body kits; allows underbody / normal parts", () => {
    assert.equal(isBodyKitProduct({ name: "Civic Body Kit", slug: "civic-body-kit" }), true);
    assert.equal(productAllowsCod({ name: "Civic Body Kit", slug: "civic-body-kit" }), false);
    assert.equal(
      productAllowsCod({ name: "Underbody LED Kit", slug: "underbody-led-kit" }),
      true
    );
    assert.equal(productAllowsCod({ name: "Floor Mat", slug: "floor-mat", codEnabled: true }), true);
  });
});

describe("prepaid discount arithmetic", () => {
  it("applies configured % to subtotal after coupon for JazzCash", () => {
    const r = computeAdvancePaymentDiscount({
      amountAfterCoupon: 10000,
      paymentMethod: "jazzcash",
      storePayment: { advancePaymentDiscountPercent: PREPAID_DISCOUNT_PERCENT },
    });
    assert.equal(r.applied, true);
    assert.equal(r.percent, 4);
    assert.equal(r.discount, 400);
  });

  it("does not apply on COD", () => {
    const r = computeAdvancePaymentDiscount({
      amountAfterCoupon: 10000,
      paymentMethod: "cod",
      storePayment: { advancePaymentDiscountPercent: 4 },
    });
    assert.equal(r.applied, false);
    assert.equal(r.discount, 0);
  });
});

describe("advance / returns copy alignment", () => {
  it("does not promise unconditional fitment refunds", () => {
    const copy = advancePaymentCopy({ prepaidPercent: 4 });
    assert.match(copy.deductedNote, /deducted from the order total/i);
    assert.doesNotMatch(copy.deductedNote, /doesn't fit/i);
    assert.match(copy.higherAdvanceNote, /Body kits cannot use Cash on Delivery/i);
    assert.match(advanceFitmentFaqAnswer(), /Buyer-selected wrong/i);
    assert.match(returnsPolicyCanonical(), /not eligible/i);
    assert.equal(STORE_POLICY.returns.changeOfMindEligible, false);
  });

  it("sanitizes legacy advance CMS messages", () => {
    const scrubbed = sanitizeAdvancePaymentMessage(
      "A Rs. {amount} booking amount is required. It is deducted from your total and fully refunded if the item doesn't fit. Send WhatsApp: {whatsapp}"
    );
    assert.doesNotMatch(scrubbed, /doesn't fit/i);
    assert.match(scrubbed, /deducted from your total/i);
  });
});

describe("blog / product conflict scrubbers", () => {
  it("rewrites flat-250-every-order and change-of-mind exchange claims", () => {
    const html = scrubPolicyConflictHtml(
      "<p>Standard delivery is a flat Rs. 250 on every order.</p><p>No. Change-of-mind returns are exchange-only for a different product or size.</p>"
    );
    assert.match(html, /Rs\. 500|bulky/i);
    assert.doesNotMatch(html, /exchange-only/i);
    const plain = scrubPolicyConflictPlain(
      "CrazzyCars delivery: flat Rs. 250 on every order, paid in advance. Change-of-mind = exchange only."
    );
    assert.doesNotMatch(plain, /flat Rs\. 250 on every order/i);
    assert.doesNotMatch(plain, /exchange only/i);
  });

  it("strips stale fitment-fields boilerplate", () => {
    const out = scrubStaleProductBoilerplate(
      '<div data-cc-unique="1"><p>CrazzyCars listing — Ambient.</p><p>Use the fitment fields on this page to match your car..</p></div><p>Real copy</p>'
    );
    assert.doesNotMatch(out, /fitment fields/i);
    assert.doesNotMatch(out, /data-cc-unique/);
    assert.match(out, /Real copy/);
  });

  it("exposes canonical policy blog metas", () => {
    const d = policyBlogCanonicalMeta("delivery-charges-regular-vs-bulky-pakistan");
    assert.match(d.metaDescription, /Rs\. 250/);
    assert.match(d.metaDescription, /Rs\. 500/);
    const r = policyBlogCanonicalMeta("car-accessories-returns-wrong-item-pakistan");
    assert.match(r.metaDescription, /not eligible|no change-of-mind/i);
  });
});

describe("vehicle card labels", () => {
  it("never shows Classic / Gen-only without model", () => {
    assert.equal(isAmbiguousVehicleQualifier("Classic"), true);
    assert.equal(isAmbiguousVehicleQualifier("7th Gen"), true);
    assert.equal(isAmbiguousVehicleQualifier("E140"), true);
    assert.equal(
      vehicleCardModelLabel({
        make: "Honda",
        model: "City",
        generation: "Classic",
        nickname: "Classic",
        displayName: "Honda City Classic (2009–2020)",
      }),
      "City Classic"
    );
    assert.equal(
      vehicleCardModelLabel({
        make: "Toyota",
        model: "Corolla",
        generation: "E140",
        displayName: "Toyota Corolla E140 (2009–2014)",
      }),
      "Corolla E140"
    );
    assert.match(codAdvanceTierSummary(), /1,000/);
  });
});
