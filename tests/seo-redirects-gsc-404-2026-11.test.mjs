/**
 * GSC "Not found (404)" / "Redirect error" audit, 23 Nov 2026 (no live HTTP).
 * Pages deleted or renamed without a redirect must now land on a live page in one hop.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  DELETED_URL_REDIRECTS,
  REDIRECTED_PRODUCT_SLUGS,
  isRedirectSourcePath,
  resolveDeletedPath,
} from "../storecraft-store/lib/deletedUrlRedirects.mjs";
import {
  resolveFlatProductFallback,
  resolveProductRedirectPath,
} from "../storecraft-store/lib/productFallbackRedirects.mjs";
import {
  OLD_BLOG_NEWS_REDIRECTS,
  resolveOldBlogNewsPath,
} from "../storecraft-store/lib/oldBlogNewsRedirects.mjs";

const NEON_PAIR = "/toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair";

test("recently deleted products, blogs and car hubs resolve to a live page", () => {
  const cases = {
    "/toyota-corolla-2014-2026-carbon-interior-combo": "/cars/toyota-corolla-e170-2014-2026",
    "/honda-civic-reborn-2006-2012-carbon-interior-combo": "/cars/honda-civic-reborn-2006-2012",
    "/usb-galaxy-moon-star-projector-light-car-roof": "/usb-car-roof-star-night-light-galaxy-projector",
    "/toyota-corolla-2014-2026-side-mirror-neon-style-indicator": NEON_PAIR,
    "/blogs/cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan": "/blogs/led-ambient-lighting-car-buyer-guide",
    "/cars/1-genx120": "/cars/toyota-mark-x-2004-1-genx120",
  };
  for (const [from, to] of Object.entries(cases)) {
    assert.equal(resolveDeletedPath(from), to, from);
  }
  // Flat product slugs also resolve through the middleware/page fallback helper.
  assert.equal(
    resolveFlatProductFallback("toyota-corolla-2014-2023-interior-door-handle-carbon-fiber-trims-8pcs-crazzycars-pk"),
    "/toyota-corolla-2014-2026-interior-door-handle-carbon-fiber-trims-4pcs"
  );
});

test("old Shopify handles: suffix-stripped twins that no longer exist get a real target", () => {
  // Previously /products/<x>-crazzycars-pk → /<x> → 404.
  assert.equal(
    resolveProductRedirectPath("batman-style-side-mirror-cover-toyota-corolla-e170-yaris-aqua-vitz-crazzycars-pk"),
    "/toyota-corolla-2015-2022-batman-style-side-mirror-cover"
  );
  assert.equal(
    resolveProductRedirectPath("toyota-corolla-2014-2023-interior-door-handle-carbon-fiber-trims-8pcs-crazzycars-pk"),
    "/toyota-corolla-2014-2026-interior-door-handle-carbon-fiber-trims-4pcs"
  );
  assert.equal(
    resolveProductRedirectPath("universal-sportline-full-kit-front-splitter-side-skirts-rear-red-black-crazzycars-pk"),
    "/categories/splitters-side-skirts"
  );
});

test("sequential-indicator fallback no longer points at the deleted neon-style page", () => {
  for (const h of [
    "toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair",
    "toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair-crazzycars-pk",
  ]) {
    assert.equal(resolveProductRedirectPath(h), NEON_PAIR, h);
  }
});

test("old /blogs/news posts with a clear match redirect in one hop", () => {
  assert.equal(
    resolveOldBlogNewsPath("/blogs/news/best-car-accessories-for-haval-h6-in-pakistan-2024"),
    "/cars/haval-h6-2021-present"
  );
  assert.equal(
    resolveOldBlogNewsPath("/blogs/news/car-accessories-online-shopping-pakistan-cash-on-delivery"),
    "/blogs/cod-vs-online-payment-car-accessories-pakistan"
  );
});

test("no redirect chains: no destination is itself a redirect source", () => {
  const all = [...DELETED_URL_REDIRECTS, ...OLD_BLOG_NEWS_REDIRECTS];
  for (const r of all) {
    assert.ok(!isRedirectSourcePath(r.destination), `${r.source} → ${r.destination} is a chain`);
    assert.equal(resolveOldBlogNewsPath(r.destination), null, `${r.destination} chains via blog map`);
  }
  const sources = all.map((r) => r.source.toLowerCase());
  assert.equal(new Set(sources).size, sources.length, "duplicate redirect source");
});

test("blog rows are not treated as product slugs", () => {
  assert.ok(REDIRECTED_PRODUCT_SLUGS.every((s) => !s.startsWith("blogs/")));
});

test("middleware routes singular /product/{slug} through the DB-resolving /products route", () => {
  const src = readFileSync(new URL("../storecraft-store/middleware.js", import.meta.url), "utf8");
  assert.match(src, /prefix === "\/product\/"[\s\S]{0,200}url\.pathname = `\/products\/\$\{rest\}`[\s\S]{0,80}NextResponse\.rewrite\(url\)/);
});
