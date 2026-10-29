/**
 * Type-safe settings coercion — address as string | object | missing must never throw.
 * Run: node --test tests/normalizeStoreSettings-address.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asSettingsString } from "../lib/settingsString.js";
import { createRequire } from "node:module";

// Light stub of buildStoreSettingsPayload crash site (same logic as production).
function buildAddressOnly(general = {}, footer = {}) {
  const g = general || {};
  const f = footer || {};
  return (
    asSettingsString(g.address) ||
    asSettingsString(f.registeredAddress) ||
    asSettingsString(f.contact?.address) ||
    ""
  );
}

describe("asSettingsString", () => {
  it("keeps trimmed strings", () => {
    assert.equal(asSettingsString("  Gujranwala  "), "Gujranwala");
  });
  it("joins object address fields", () => {
    assert.equal(
      asSettingsString({ city: "Gujranwala", region: "Punjab", country: "PK" }),
      "Gujranwala, Punjab, PK"
    );
  });
  it("returns fallback when missing", () => {
    assert.equal(asSettingsString(undefined, "fallback"), "fallback");
    assert.equal(asSettingsString(null, ""), "");
  });
});

describe("payment settings address shapes", () => {
  it("address as string", () => {
    assert.equal(
      buildAddressOnly({ address: "Gujranwala, Punjab, Pakistan" }),
      "Gujranwala, Punjab, Pakistan"
    );
  });
  it("address as object (live bug shape) does not throw", () => {
    assert.doesNotThrow(() => buildAddressOnly({ address: { city: "Gujranwala" } }));
    assert.match(buildAddressOnly({ address: { city: "Gujranwala" } }), /Gujranwala/);
  });
  it("address missing uses empty string", () => {
    assert.equal(buildAddressOnly({}), "");
  });
});

// Keep require unused import quiet if tree-shaken — document intent for full payload test in CI later.
void createRequire;
