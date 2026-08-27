/**
 * Product slug candidates + paid-404 helpers (no DB).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { productSlugCandidates } from "../storecraft-store/lib/productSlugParam.js";
import { detectPaidSocialSource } from "../storecraft-store/lib/paidTraffic.js";
import { parseSearchQuery, scoreSearchCandidate } from "../storecraft-store/lib/smartProductSearch.js";
import {
  isConfidentMissingSuggestion,
  looksLikeProductSlug,
  slugFromPathname,
  slugParamToSearchQuery,
} from "../storecraft-store/lib/missingProductHelpers.js";

describe("productSlugCandidates", () => {
  it("strips Meta/seed -crazzycars-pk suffix", () => {
    assert.deepEqual(
      productSlugCandidates(
        "toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play-crazzycars-pk"
      ),
      [
        "toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play-crazzycars-pk",
        "toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play",
      ]
    );
  });

  it("also tries adding the suffix when the inbound slug lacks it", () => {
    assert.deepEqual(productSlugCandidates("honda-civic-premium-fog-lights-with-covers-2018-2020"), [
      "honda-civic-premium-fog-lights-with-covers-2018-2020",
      "honda-civic-premium-fog-lights-with-covers-2018-2020-crazzycars-pk",
    ]);
  });
});

describe("looksLikeProductSlug", () => {
  it("accepts catalog-style handles and rejects reserved words", () => {
    assert.equal(
      looksLikeProductSlug("toyota-corolla-lava-style-tail-lights-2012-2014-crazzycars-pk"),
      true
    );
    assert.equal(looksLikeProductSlug("shop"), false);
    assert.equal(looksLikeProductSlug("ab"), false);
  });
});

describe("slugFromPathname / slugParamToSearchQuery", () => {
  it("unwraps /products/:handle", () => {
    assert.equal(
      slugFromPathname("/products/honda-civic-fog-lights-crazzycars-pk"),
      "honda-civic-fog-lights-crazzycars-pk"
    );
    assert.equal(slugFromPathname("/toyota-corolla-splitter"), "toyota-corolla-splitter");
  });

  it("turns a handle into a search query", () => {
    assert.equal(
      slugParamToSearchQuery("toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs-crazzycars-pk"),
      "toyota corolla 2015 2024 front spike splitter canard 3pcs"
    );
  });
});

describe("detectPaidSocialSource", () => {
  it("detects Meta click ids, utm, and Facebook referrers", () => {
    assert.equal(
      detectPaidSocialSource({
        searchParams: new URLSearchParams("fbclid=abc"),
        referer: "",
      }),
      "meta"
    );
    assert.equal(
      detectPaidSocialSource({
        searchParams: new URLSearchParams("utm_source=instagram&utm_medium=paid"),
        referer: "",
      }),
      "meta"
    );
    assert.equal(
      detectPaidSocialSource({
        searchParams: new URLSearchParams(),
        referer: "https://l.facebook.com/l.php?u=https://crazzycars.pk/x",
      }),
      "meta"
    );
    assert.equal(
      detectPaidSocialSource({
        searchParams: new URLSearchParams("gclid=1"),
        referer: "",
      }),
      "google"
    );
  });
});

describe("isConfidentMissingSuggestion", () => {
  it("rejects a Civic product for a Corolla slug", () => {
    const parsed = {
      makeTokens: ["toyota"],
      modelTokens: ["corolla"],
      typeTokens: ["splitter"],
      significantTokens: ["toyota", "corolla", "splitter"],
      tokens: ["toyota", "corolla", "splitter"],
    };
    assert.equal(
      isConfidentMissingSuggestion(
        { name: "Honda Civic Premium Fog Lights", slug: "honda-civic-premium-fog-lights" },
        parsed,
        900
      ),
      false
    );
    assert.equal(
      isConfidentMissingSuggestion(
        {
          name: "Toyota Corolla 2015-2024 Front Spike Splitter",
          slug: "toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs",
        },
        parsed,
        400
      ),
      true
    );
  });

  it("refuses a same-vehicle body kit for a splitter 404 (part-type gate)", () => {
    const parsed = parseSearchQuery(
      slugParamToSearchQuery("suzuki-swift-front-splitter-crazzycars-pk")
    );
    assert.deepEqual(parsed.typeTokens, ["splitter"]);
    assert.ok(parsed.makeTokens.includes("suzuki"));
    assert.ok(parsed.makeTokens.includes("swift"));

    const rsKit = {
      name: "Suzuki Swift 2022-2024 RS Style Body Kit Fibreglass",
      slug: "suzuki-swift-2022-2024-rs-style-body-kit-fibreglass",
    };
    const swiftSplitter = {
      name: "Suzuki Swift Front Splitter Gloss Black",
      slug: "suzuki-swift-front-splitter-gloss-black",
    };

    assert.equal(
      isConfidentMissingSuggestion(rsKit, parsed, scoreSearchCandidate(rsKit, parsed, 0)),
      false
    );
    // Type gate alone is enough — even if leftover words like "front" are ignored.
    const typeOnly = { ...parsed, modelTokens: [] };
    assert.equal(isConfidentMissingSuggestion(rsKit, typeOnly, 900), false);
    assert.equal(isConfidentMissingSuggestion(swiftSplitter, parsed, 900), true);
  });
});
