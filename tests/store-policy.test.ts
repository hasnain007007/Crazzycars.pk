/**
 * STORE_POLICY shape + copy helpers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STORE_POLICY } from "../storecraft-store/config/store-policy.js";
import {
  buildMerchantReturnPolicies,
} from "../storecraft-store/lib/schema/merchantReturnPolicy.mjs";
import {
  returnsPolicyCanonical,
  standardDeliveryFeeStatement,
  deliveryEtaSummary,
  nonLahoreEtaStatement,
} from "../storecraft-store/lib/storePolicyCopy.js";

describe("STORE_POLICY", () => {
  it("has confirmed Gujranwala shipping values", () => {
    assert.equal(STORE_POLICY.shipping.freeDeliveryExists, false);
    assert.equal(STORE_POLICY.shipping.freeShippingThresholdPKR, null);
    assert.equal(STORE_POLICY.shipping.standardFeePKR, 250);
    assert.equal(STORE_POLICY.shipping.bulkyFeePKR, 500);
    assert.deepEqual(STORE_POLICY.shipping.cityETAs.lahore, { minDays: 2, maxDays: 3 });
    assert.equal(STORE_POLICY.shipping.cityETAs.default, null);
    assert.equal(STORE_POLICY.shipping.codAvailable, true);
  });

  it("has confirmed returns values", () => {
    assert.deepEqual(STORE_POLICY.returns.eligibleReasons, ["defective", "wrong-item-shipped"]);
    assert.equal(STORE_POLICY.returns.changeOfMindEligible, false);
    assert.equal(STORE_POLICY.returns.changeOfMindRemedy, "exchange-only");
    assert.equal(STORE_POLICY.returns.validReturnRefundType, "full-refund");
    assert.equal(STORE_POLICY.returns.returnShippingPaidBy, "store");
    assert.equal(STORE_POLICY.returns.windowDays, 7);
  });

  it("emits two-path MerchantReturnPolicy", () => {
    const policies = buildMerchantReturnPolicies("https://gujranwalamotorsports.com");
    assert.equal(policies.length, 2);
    assert.match(policies[0].refundType, /FullRefund$/);
    assert.match(policies[1].refundType, /ExchangeRefund$/);
    assert.match(policies[0].itemDefectReturnFees, /FreeReturn$/);
  });

  it("uses canonical returns copy", () => {
    assert.match(returnsPolicyCanonical(), /within 7 days/);
    assert.match(returnsPolicyCanonical(), /defective/);
    assert.match(returnsPolicyCanonical(), /exchange/);
    assert.match(standardDeliveryFeeStatement(), /Rs\. 250/);
    assert.match(standardDeliveryFeeStatement(), /Rs\. 500|bulky/i);
    assert.match(deliveryEtaSummary(), /Lahore: 2–3/);
    assert.match(nonLahoreEtaStatement(), /confirmed at checkout/);
  });
});
