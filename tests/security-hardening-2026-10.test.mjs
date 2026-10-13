/**
 * Regression tests for the Oct 2026 security pass:
 * single-use reset links, cost-price redaction, social import path guards.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  passwordResetFingerprint,
  passwordResetFingerprintMatches,
} from "../storecraft-store/lib/passwordResetFingerprint.js";
import { stripLineItemCosts } from "../storecraft-admin/lib/permissions.js";
import {
  importDir,
  isAllowedImportImage,
  safeRelPath,
} from "../storecraft-admin/lib/social/importService.js";

describe("password reset fingerprint", () => {
  const hash = "$2a$12$abcdefghijklmnopqrstuuJ5x0xvY8r3xD5nq0eWm8n2l5H8Wm4aG";

  it("matches the hash it was issued for", () => {
    assert.equal(passwordResetFingerprintMatches(passwordResetFingerprint(hash), hash), true);
  });

  it("stops matching once the password hash changes", () => {
    const issued = passwordResetFingerprint(hash);
    assert.equal(passwordResetFingerprintMatches(issued, `${hash}x`), false);
  });

  it("rejects tokens without a fingerprint and accounts without a password", () => {
    assert.equal(passwordResetFingerprintMatches(undefined, hash), false);
    assert.equal(passwordResetFingerprintMatches("", ""), false);
  });
});

describe("stripLineItemCosts", () => {
  const order = { id: "o1", items: [{ name: "Mat", unitPrice: 2000, unitCost: 900 }] };

  it("hides unitCost from roles without canViewProductCosts", () => {
    for (const role of ["manager", "staff", "viewer"]) {
      const out = stripLineItemCosts(order, { role });
      assert.equal("unitCost" in out.items[0], false, role);
      assert.equal(out.items[0].unitPrice, 2000);
    }
  });

  it("keeps unitCost for the owner and does not mutate the input", () => {
    assert.equal(stripLineItemCosts(order, { role: "owner" }).items[0].unitCost, 900);
    stripLineItemCosts(order, { role: "viewer" });
    assert.equal(order.items[0].unitCost, 900);
  });
});

describe("social import path guards", () => {
  it("rejects import ids that are not UUIDs", () => {
    assert.throws(() => importDir("../../etc"), /Invalid import id/);
    assert.throws(() => importDir("abc"), /Invalid import id/);
    assert.ok(importDir("3f2b8c1e-9a4d-4e2f-8b1a-0c9d8e7f6a5b").endsWith("3f2b8c1e-9a4d-4e2f-8b1a-0c9d8e7f6a5b"));
  });

  it("strips traversal segments from client file names", () => {
    assert.equal(safeRelPath("../../../app/.next/server/x.js"), "app/.next/server/x.js");
    assert.equal(safeRelPath("..\\..\\photo.jpg"), "photo.jpg");
    assert.throws(() => safeRelPath("../.."), /Unsafe file path/);
  });

  it("only allows photo extensions", () => {
    assert.equal(isAllowedImportImage("P1-front.JPG"), true);
    assert.equal(isAllowedImportImage("p.webp"), true);
    assert.equal(isAllowedImportImage("evil.svg"), false);
    assert.equal(isAllowedImportImage("evil.html"), false);
    assert.equal(isAllowedImportImage("photo.jpg.html"), false);
  });
});
