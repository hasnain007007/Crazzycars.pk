/**
 * Tiered shipping policy assertions (store policy + MAX rule).
 * COD advance MAX() is covered in productAdvance.js; exercised live via checkout.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STORE_POLICY } from "../storecraft-store/config/store-policy.js";

describe("shipping tier policy", () => {
  it("defines regular 250 and bulky 500 floors", () => {
    assert.equal(STORE_POLICY.shipping.standardFeePKR, 250);
    assert.equal(STORE_POLICY.shipping.bulkyFeePKR, 500);
  });

  it("MAX(floor, zone) matches approved rule", () => {
    const floor = (bulky) =>
      bulky ? STORE_POLICY.shipping.bulkyFeePKR : STORE_POLICY.shipping.standardFeePKR;
    const apply = (zone, bulky) => {
      const f = floor(bulky);
      const z = Math.max(0, Number(zone) || 0);
      return Math.max(f, z > 0 ? z : f);
    };
    assert.equal(apply(0, false), 250);
    assert.equal(apply(0, true), 500);
    assert.equal(apply(300, false), 300);
    assert.equal(apply(300, true), 500);
    assert.equal(apply(700, true), 700);
    assert.equal(apply(700, false), 700);
  });
});
