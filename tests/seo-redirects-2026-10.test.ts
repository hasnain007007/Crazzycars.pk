/**
 * Phase 1 SEO redirect map + pagination canonical tests (no live HTTP).
 * Status codes: production uses 308; tests accept 301 or 308 as permanent.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  COLLECTIONS_REDIRECT_MAP,
  resolveCollectionRedirect,
} from "../storecraft-store/lib/collectionRedirectMap.mjs";
import {
  PRODUCT_FALLBACK_REDIRECTS,
  resolveFlatProductFallback,
  resolveProductRedirectPath,
} from "../storecraft-store/lib/productFallbackRedirects.mjs";
import { buildLegacyRedirects, resolveLegacyDestination } from "../storecraft-store/lib/legacyHandleMaps.mjs";
import {
  listingCanonicalPath,
  parseListingSearchParams,
} from "../storecraft-store/lib/listingQuery.js";
import { STRIP_QUERY_KEYS } from "../storecraft-store/lib/stripQueryKeys.mjs";

const PERMANENT = new Set([301, 308]);

function assertPermanentStatus(status: number) {
  assert.ok(PERMANENT.has(status), `expected 301 or 308, got ${status}`);
}

describe("collections redirect map (Pages.csv + brief)", () => {
  test("brief-known mappings resolve to verified targets", () => {
    assert.equal(resolveCollectionRedirect("interior-light"), "/categories/interior-lights");
    assert.equal(resolveCollectionRedirect("car-steering-wheel-covers"), "/categories/steering-wheel-covers");
    assert.equal(resolveCollectionRedirect("led-indicator-lights"), "/categories/led-indicator-lights");
    assert.equal(resolveCollectionRedirect("car-splitters-side-skirts"), "/categories/splitters-side-skirts");
    assert.equal(resolveCollectionRedirect("carbon-fiber-side-mirror-covers"), "/categories/side-mirror-covers");
    assert.equal(
      resolveCollectionRedirect("car-quarter-window-louvers"),
      "/categories/quarter-window-louvers"
    );
    assert.equal(
      resolveCollectionRedirect("toyota-yaris-accessories-shop-online-crazzycars-pk"),
      "/cars/toyota-yaris-2020-present"
    );
    assert.equal(
      resolveCollectionRedirect("toyota-aqua-accessories-shop-online-crazzycars-pk"),
      "/cars/toyota-aqua-2012-present"
    );
    assert.equal(
      resolveCollectionRedirect("toyota-corolla-2009-2014-accessories"),
      "/cars/toyota-corolla-e140-2009-2014"
    );
    assert.equal(
      resolveCollectionRedirect("honda-civic-reborn-2006-2012-accessories"),
      "/cars/honda-civic-reborn-2006-2012"
    );
    assert.equal(
      resolveCollectionRedirect("suzuki-swift-2025-present-accessories"),
      "/cars/suzuki-swift-2025-present"
    );
    assert.equal(resolveCollectionRedirect("all"), "/shop");
  });

  test("no collection rule targets the homepage", () => {
    for (const [handle, dest] of Object.entries(COLLECTIONS_REDIRECT_MAP)) {
      assert.notEqual(dest, "/", handle);
      assert.notEqual(dest, "", handle);
      assert.match(dest, /^\//, handle);
    }
  });

  test("buildLegacyRedirects includes /collections/ entries without duplicates", () => {
    const redirects = buildLegacyRedirects();
    const collectionSources = redirects.filter((r) => r.source.startsWith("/collections/"));
    assert.ok(collectionSources.length >= Object.keys(COLLECTIONS_REDIRECT_MAP).length);
    const seen = new Set<string>();
    for (const r of collectionSources) {
      assert.equal(seen.has(r.source), false, `duplicate ${r.source}`);
      seen.add(r.source);
      assert.equal(r.permanent, true);
      assert.notEqual(r.destination, "/");
    }
  });

  test("legacy destination prefers collection map", () => {
    assert.equal(resolveLegacyDestination("interior-light"), "/categories/interior-lights");
    assert.equal(resolveLegacyDestination("honda-city"), "/cars/honda-city-2021-present");
  });
});

describe("product /products/ → flat (and fallbacks)", () => {
  test("existing catalogue handles strip to flat slug in one hop", () => {
    assert.equal(resolveProductRedirectPath("car-heads-up-display-hud"), "/car-heads-up-display-hud");
    assert.equal(
      resolveProductRedirectPath("car-heads-up-display-hud-crazzycars-pk"),
      "/car-heads-up-display-hud"
    );
  });

  test("missing flat twins use closest live PDP (never /)", () => {
    assert.equal(
      resolveProductRedirectPath("canbus-bright-led-indicator-bulbs-2-pcs-crazzycars-pk"),
      "/bright-led-indicator-bulbs-2-pcs"
    );
    assert.equal(
      resolveProductRedirectPath("honda-civic-reborn-2006-2011-body-kit-d1-crazzycars-pk"),
      "/honda-civic-reborn-2006-2011-body-kit-d3"
    );
    assert.equal(
      resolveFlatProductFallback("suzuki-swift-2018-2024-complete-body-kit-fibreglass"),
      "/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass"
    );
    for (const dest of Object.values(PRODUCT_FALLBACK_REDIRECTS)) {
      assert.notEqual(dest, "/");
      assert.match(dest, /^\//);
    }
  });
});

describe("pagination query + canonical", () => {
  test("middleware strip list does not include page", () => {
    assert.equal(STRIP_QUERY_KEYS.has("page"), false);
  });

  test("page=1 canonicals to clean URL; page>1 is self-canonical", () => {
    const page1 = parseListingSearchParams(new URLSearchParams("page=1"));
    const page2 = parseListingSearchParams(new URLSearchParams("page=2"));
    const page3 = parseListingSearchParams(new URLSearchParams("page=3"));
    assert.equal(listingCanonicalPath("/categories/interior-lights", page1), "/categories/interior-lights");
    assert.equal(
      listingCanonicalPath("/categories/interior-lights", page2),
      "/categories/interior-lights?page=2"
    );
    assert.equal(listingCanonicalPath("/shop", page3), "/shop?page=3");
  });
});

describe("permanent redirect status contract", () => {
  test("accepts 301 or 308 as permanent", () => {
    assertPermanentStatus(301);
    assertPermanentStatus(308);
    assert.throws(() => assertPermanentStatus(302));
  });
});
