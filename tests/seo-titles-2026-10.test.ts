import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PAGE_SEO_OVERRIDES,
  assertSeoLengths,
} from "../storecraft-store/lib/seo/gscAudit2026-10.mjs";

describe("GSC audit Phase 2 title/meta length", () => {
  test("every Phase 2 title ≤ 62 and meta ≤ 160", () => {
    const errors = [];
    for (const [path, pair] of Object.entries(PAGE_SEO_OVERRIDES)) {
      errors.push(...assertSeoLengths(pair, path));
    }
    assert.deepEqual(errors, []);
  });

  test("Phase 2 paths from the brief are present", () => {
    const required = [
      "/car-heads-up-display-hud",
      "/categories/interior-lights",
      "/cars/toyota-yaris-2020-present",
      "/contact",
      "/",
    ];
    for (const p of required) {
      assert.ok(PAGE_SEO_OVERRIDES[p], p);
    }
  });
});
