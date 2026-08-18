import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildUrlSetXml,
  buildSitemapIndexXml,
  formatLastMod,
  MAX_SITEMAP_URLS,
} from "../storecraft-store/lib/sitemap/xml.js";
import {
  ROBOTS_PRIVATE_PATHS,
  ROBOTS_FILTER_QUERY_DISALLOWS,
  buildRobotsDisallowList,
} from "../storecraft-store/lib/seo/robotsTxt.js";
import {
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
} from "../storecraft-store/lib/seo/robotsMeta.js";

describe("sitemap XML", () => {
  test("urlset uses real lastmod and omits missing timestamps", () => {
    const xml = buildUrlSetXml([
      {
        loc: "https://crazzycars.pk/shop",
        lastmod: new Date("2026-01-15T00:00:00.000Z"),
        changefreq: "daily",
        priority: 0.9,
      },
      { loc: "https://crazzycars.pk/faq", changefreq: "weekly", priority: 0.5 },
    ]);
    assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert.match(xml, /<loc>https:\/\/crazzycars.pk\/shop<\/loc>/);
    assert.match(xml, /<lastmod>2026-01-15T00:00:00.000Z<\/lastmod>/);
    assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
    assert.doesNotMatch(xml, /\?sort=/);
  });

  test("sitemap index lists child sitemaps", () => {
    const xml = buildSitemapIndexXml([
      { loc: "https://crazzycars.pk/sitemap-products.xml", lastmod: "2026-02-01T12:00:00.000Z" },
      { loc: "https://crazzycars.pk/sitemap-categories.xml" },
    ]);
    assert.match(xml, /<sitemapindex /);
    assert.match(xml, /<loc>https:\/\/crazzycars.pk\/sitemap-products.xml<\/loc>/);
    assert.match(xml, /<loc>https:\/\/crazzycars.pk\/sitemap-categories.xml<\/loc>/);
    assert.equal(formatLastMod("not-a-date"), "");
    assert.equal(MAX_SITEMAP_URLS, 50000);
  });
});

describe("robots.txt rules", () => {
  test("disallows private paths and filter queries, not CSS/JS or pagination", () => {
    const disallow = buildRobotsDisallowList();
    for (const path of ["/cart/", "/checkout/", "/account/", "/wishlist", "/search", "/api/"]) {
      assert.ok(ROBOTS_PRIVATE_PATHS.includes(path), path);
    }
    assert.ok(disallow.includes("/*?*sort="));
    assert.ok(ROBOTS_FILTER_QUERY_DISALLOWS.includes("/*?*q="));
    assert.ok(!ROBOTS_FILTER_QUERY_DISALLOWS.includes("/*?*page="));
    assert.ok(!disallow.some((p) => p.includes(".css") || p.includes(".js") || p === "/_next/"));
  });
});

describe("meta robots constants", () => {
  test("commercial pages index,follow; filters and search noindex,follow; checkout noindex,nofollow", () => {
    assert.equal(ROBOTS_INDEX_FOLLOW.index, true);
    assert.equal(ROBOTS_INDEX_FOLLOW.follow, true);
    assert.equal(ROBOTS_NOINDEX_FOLLOW.index, false);
    assert.equal(ROBOTS_NOINDEX_FOLLOW.follow, true);
    assert.equal(ROBOTS_NOINDEX_NOFOLLOW.index, false);
    assert.equal(ROBOTS_NOINDEX_NOFOLLOW.follow, false);
  });
});
