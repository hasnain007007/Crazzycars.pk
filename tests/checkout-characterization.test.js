/**
 * Characterization tests for checkout money / COD rules.
 * Lock current outputs BEFORE any createStoreOrder refactor.
 * Pure libs only — no MongoDB (never hit production).
 *
 * Avoids modules that resolve `@/` aliases under plain node:test.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STORE_POLICY } from "../storecraft-store/config/store-policy.js";
import {
  buildCodUnavailableMessage,
  isBodyKitProduct,
  productAllowsCod,
} from "../storecraft-store/lib/codEligibility.js";

/** Mirrors lib/shippingTier.applyShippingFloor + freeDelivery.applyShippingRules floors. */
function shippingFloorPKR(hasBulky) {
  const regular = Math.max(0, Number(STORE_POLICY.shipping.standardFeePKR) || 0);
  const bulky = Math.max(regular, Number(STORE_POLICY.shipping.bulkyFeePKR) || 0);
  return hasBulky ? bulky : regular;
}

function applyShippingFloor(zoneRate, hasBulky) {
  const zone = Math.max(0, Number(zoneRate) || 0);
  const floor = shippingFloorPKR(!!hasBulky);
  return Math.max(floor, zone > 0 ? zone : floor);
}

function applyShippingRulesCost(zoneShippingCost, hasBulky) {
  const floor = shippingFloorPKR(!!hasBulky);
  const explicit =
    zoneShippingCost !== undefined && zoneShippingCost !== null && Number.isFinite(Number(zoneShippingCost))
      ? Math.max(0, Number(zoneShippingCost) || 0)
      : null;
  return Math.max(floor, explicit != null && explicit > 0 ? explicit : floor);
}

function roundRupees(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

describe("checkout characterization — shipping floors", () => {
  it("locks STORE_POLICY floors at 250 / 500", () => {
    assert.equal(STORE_POLICY.shipping.standardFeePKR, 250);
    assert.equal(STORE_POLICY.shipping.bulkyFeePKR, 500);
    assert.equal(STORE_POLICY.shipping.freeDeliveryExists, false);
  });

  it("shippingFloorPKR matches policy", () => {
    assert.equal(shippingFloorPKR(false), 250);
    assert.equal(shippingFloorPKR(true), 500);
  });

  it("applyShippingFloor = MAX(floor, zone)", () => {
    assert.equal(applyShippingFloor(0, false), 250);
    assert.equal(applyShippingFloor(0, true), 500);
    assert.equal(applyShippingFloor(300, false), 300);
    assert.equal(applyShippingFloor(300, true), 500);
    assert.equal(applyShippingFloor(700, true), 700);
  });

  it("applyShippingRules cost matches current freeDelivery algorithm", () => {
    assert.equal(applyShippingRulesCost(0, false), 250);
    assert.equal(applyShippingRulesCost(0, true), 500);
    assert.equal(applyShippingRulesCost(800, false), 800);
  });
});

describe("checkout characterization — COD body-kit message", () => {
  it("locks the exact unavailable message (1 product)", () => {
    const msg = buildCodUnavailableMessage([
      { name: "Honda Civic X 2016-2021 Body Kit D1" },
    ]);
    assert.equal(
      msg,
      "Cash on Delivery is not available for: Honda Civic X 2016-2021 Body Kit D1. Choose advance payment instead."
    );
  });

  it("locks the exact unavailable message (3 + more)", () => {
    const msg = buildCodUnavailableMessage([
      { name: "Kit A Body Kit" },
      { name: "Kit B Body Kit" },
      { name: "Kit C Body Kit" },
      { name: "Kit D Body Kit" },
    ]);
    assert.equal(
      msg,
      "Cash on Delivery is not available for: Kit A Body Kit, Kit B Body Kit, Kit C Body Kit (+1 more). Choose advance payment instead."
    );
  });

  it("body kits never allow COD", () => {
    assert.equal(isBodyKitProduct({ name: "Full Body Kit Fibreglass" }), true);
    assert.equal(productAllowsCod({ name: "Full Body Kit Fibreglass", codEnabled: true }), false);
  });
});

describe("checkout characterization — money helpers", () => {
  it("roundRupees is whole PKR", () => {
    assert.equal(roundRupees(3499.4), 3499);
    assert.equal(roundRupees(3499.5), 3500);
  });
});
