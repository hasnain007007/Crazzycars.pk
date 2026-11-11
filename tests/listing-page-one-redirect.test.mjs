/**
 * Stage 3 indexing — page=1 strip + gone atom paths.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGoneAtomFeedPath,
  isListingPathEligibleForPageOneStrip,
} from "../storecraft-store/lib/listingPageOneRedirect.mjs";

describe("isListingPathEligibleForPageOneStrip", () => {
  it("covers index listings already live on production", () => {
    assert.equal(isListingPathEligibleForPageOneStrip("/shop"), true);
    assert.equal(isListingPathEligibleForPageOneStrip("/blogs"), true);
    assert.equal(isListingPathEligibleForPageOneStrip("/cars"), true);
    assert.equal(isListingPathEligibleForPageOneStrip("/sale"), true);
  });

  it("covers category and vehicle hubs (GSC duplicate page=1)", () => {
    assert.equal(isListingPathEligibleForPageOneStrip("/categories/exterior"), true);
    assert.equal(
      isListingPathEligibleForPageOneStrip("/categories/splitters-side-skirts"),
      true
    );
    assert.equal(
      isListingPathEligibleForPageOneStrip("/cars/suzuki-swift-2025-present"),
      true
    );
  });

  it("does not strip PDP or account paths", () => {
    assert.equal(isListingPathEligibleForPageOneStrip("/toyota-corolla-splitter"), false);
    assert.equal(isListingPathEligibleForPageOneStrip("/checkout"), false);
    assert.equal(isListingPathEligibleForPageOneStrip("/categories"), false);
  });
});

describe("isGoneAtomFeedPath", () => {
  it("410s dead atom/rss leftovers", () => {
    assert.equal(isGoneAtomFeedPath("/blogs.atom"), true);
    assert.equal(isGoneAtomFeedPath("/blogs/news.atom"), true);
    assert.equal(isGoneAtomFeedPath("/collections/exterior.atom"), true);
    assert.equal(isGoneAtomFeedPath("/categories/exterior.atom"), true);
    assert.equal(isGoneAtomFeedPath("/atom"), true);
    assert.equal(isGoneAtomFeedPath("/index.xml"), true);
  });

  it("preserves live merchant feeds under /feed/", () => {
    assert.equal(isGoneAtomFeedPath("/feed/products.xml"), false);
    assert.equal(isGoneAtomFeedPath("/feed/ai-catalog.json"), false);
  });
});
