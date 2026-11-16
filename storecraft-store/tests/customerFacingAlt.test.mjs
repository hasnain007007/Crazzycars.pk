import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerFacingAlt,
  defaultAltForImage,
  findForbiddenAltToken,
} from "../lib/customerFacingAlt.js";

describe("storefront customerFacingAlt belt", () => {
  it("replaces forbidden alts with product name", () => {
    const name = "Honda City Carbon Fiber Steering Trim 2021–2026";
    const bad =
      "Honda City Carbon Fiber Steering Trim 2021–2026 — reconstructed product visual with CrazzyCars.pk branding";
    assert.equal(findForbiddenAltToken(bad), "reconstructed");
    assert.equal(customerFacingAlt(bad, name, true), name);
    assert.equal(customerFacingAlt(bad, name, false), `${name} - detail`);
  });

  it("passes through clean alts", () => {
    assert.equal(customerFacingAlt("Honda Civic Trim", "Honda Civic Trim", true), "Honda Civic Trim");
    assert.equal(defaultAltForImage("X", false), "X - detail");
  });
});
