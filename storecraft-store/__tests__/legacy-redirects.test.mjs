/**
 * Unit test: every enabled legacy-redirects.json row resolves in one hop.
 * Run: node --test __tests__/legacy-redirects.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLegacyRedirectRows,
  resolveLegacyRedirect,
  normalizePath,
} from "../lib/legacyRedirects.mjs";

describe("legacy-redirects.json", () => {
  const rows = getLegacyRedirectRows();

  it("has enabled rows", () => {
    assert.ok(rows.length >= 100, `expected ≥100 rows, got ${rows.length}`);
  });

  it("resolves every from → to in one hop (no self, no empty)", () => {
    for (const { from, to } of rows) {
      assert.ok(from.startsWith("/"), from);
      assert.ok(to.startsWith("/"), to);
      assert.notEqual(from, to, `self-redirect ${from}`);
      const got = resolveLegacyRedirect(from);
      assert.equal(got, to, `${from} → expected ${to}, got ${got}`);
      // Second lookup of destination must NOT remap (one hop).
      const second = resolveLegacyRedirect(to);
      assert.equal(second, null, `chain risk: ${to} also mapped to ${second}`);
    }
  });

  it("normalises case and trailing slash", () => {
    const sample = rows[0];
    assert.equal(
      resolveLegacyRedirect(sample.from.toUpperCase() + "/"),
      sample.to
    );
    assert.equal(normalizePath(`${sample.from}/?x=1`), sample.from);
  });

  it("never maps unknown paths to /", () => {
    assert.equal(resolveLegacyRedirect("/some-random-nonexistent-url"), null);
  });
});
