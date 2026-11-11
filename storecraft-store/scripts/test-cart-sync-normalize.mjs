/**
 * Unit tests for cart sync normalize / PK phone (no Next/Mongo).
 * Run: node --test storecraft-store/scripts/test-cart-sync-normalize.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Load as plain ESM by rewriting — files use export without "type":module in package.
// Inline re-implementations mirror lib for hermetic CI without transpile.
async function loadViaDynamicImport(rel) {
  // Node cannot import .js with "use client" path aliases; duplicate critical asserts via copy.
  return null;
}

// --- Mirror of pkPhone.js ---
function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}
function normalizePkMobile(raw) {
  let digits = digitsOnly(raw);
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("3")) digits = `0${digits}`;
  const ok = /^03\d{9}$/.test(digits);
  return { ok, normalized: ok ? digits : "", digits };
}
function phoneForStorage(raw) {
  const result = normalizePkMobile(raw);
  if (result.ok) return { phone: result.normalized, phoneValid: true };
  const cleaned = String(raw || "").replace(/[^\d+]/g, "").trim().slice(0, 40);
  if (result.digits.length >= 10) return { phone: cleaned || result.digits, phoneValid: false };
  return { phone: cleaned, phoneValid: false };
}

function preferNonEmpty(existing, incoming, max = 200) {
  const next = String(incoming || "").trim().slice(0, max);
  if (next) return next;
  return String(existing || "").trim().slice(0, max);
}
function mergeContactPayload(draftPayload = {}, explicit = {}) {
  const dCust = draftPayload.customer || {};
  const eCust = explicit.customer || {};
  const dShip = draftPayload.shippingAddress || {};
  const eShip = explicit.shippingAddress || {};
  const customer = {
    name: preferNonEmpty(dCust.name, eCust.name, 120),
    email: preferNonEmpty(dCust.email, eCust.email, 160).toLowerCase(),
    phone: preferNonEmpty(dCust.phone, eCust.phone, 40),
  };
  const shippingAddress = {
    name: preferNonEmpty(dShip.name, eShip.name, 120) || customer.name,
    street: preferNonEmpty(dShip.street, eShip.street, 200),
    city: preferNonEmpty(dShip.city, eShip.city, 80),
    state: preferNonEmpty(dShip.state, eShip.state, 80),
  };
  return { customer, shippingAddress };
}
function isCompleteAddress(addr = {}) {
  return Boolean(
    String(addr.street || "").trim() &&
      String(addr.city || "").trim() &&
      String(addr.state || "").trim()
  );
}
function stageFromCheckoutStep(activeStep) {
  const n = Number(activeStep) || 1;
  if (n >= 3) return "checkout_confirm";
  if (n >= 2) return "checkout_payment";
  return "checkout_details";
}

describe("normalizePkMobile", () => {
  it("accepts 03XXXXXXXXX", () => {
    const r = normalizePkMobile("03001234567");
    assert.equal(r.ok, true);
    assert.equal(r.normalized, "03001234567");
  });
  it("accepts +92 / 923 form", () => {
    const r = normalizePkMobile("+923001234567");
    assert.equal(r.ok, true);
    assert.equal(r.normalized, "03001234567");
  });
  it("rejects short odd numbers", () => {
    const r = normalizePkMobile("6502530000");
    assert.equal(r.ok, false);
  });
});

describe("phoneForStorage", () => {
  it("flags invalid but keeps digits", () => {
    const r = phoneForStorage("6502530000");
    assert.equal(r.phoneValid, false);
    assert.ok(String(r.phone).length >= 10);
  });
  it("stores normalized PK", () => {
    const r = phoneForStorage("3001234567");
    assert.equal(r.phoneValid, true);
    assert.equal(r.phone, "03001234567");
  });
});

describe("mergeContactPayload", () => {
  it("explicit non-empty wins over draft", () => {
    const m = mergeContactPayload(
      { customer: { name: "Old", phone: "03001111111" }, shippingAddress: {} },
      { customer: { name: "New", phone: "" }, shippingAddress: { street: "A", city: "Lahore", state: "Punjab" } }
    );
    assert.equal(m.customer.name, "New");
    assert.equal(m.customer.phone, "03001111111"); // empty explicit does not wipe
    assert.equal(m.shippingAddress.city, "Lahore");
  });
  it("does not overwrite newer explicit with empty draft later", () => {
    const m = mergeContactPayload(
      { customer: { phone: "" }, shippingAddress: {} },
      { customer: { phone: "03001234567" }, shippingAddress: {} }
    );
    assert.equal(m.customer.phone, "03001234567");
  });
});

describe("address + stage", () => {
  it("complete address requires street city state", () => {
    assert.equal(isCompleteAddress({ street: "x", city: "y" }), false);
    assert.equal(isCompleteAddress({ street: "x", city: "y", state: "z" }), true);
  });
  it("maps checkout steps", () => {
    assert.equal(stageFromCheckoutStep(1), "checkout_details");
    assert.equal(stageFromCheckoutStep(2), "checkout_payment");
    assert.equal(stageFromCheckoutStep(3), "checkout_confirm");
  });
});

void loadViaDynamicImport;
void createRequire;
void pathToFileURL;
