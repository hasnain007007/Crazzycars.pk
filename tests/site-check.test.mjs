import { test } from "node:test";
import assert from "node:assert/strict";

await import("./admin-alias-loader.mjs");
const { analysePageHtml, analyseProducts, sitemapLocs, absoluteMediaUrl } = await import(
  "../storecraft-admin/lib/siteCheck.js"
);

test("page analysis flags placeholders, broken values and noindex sitemap pages", () => {
  const good = '<title>Floor mats</title><meta name="robots" content="index, follow"><h1>Floor mats</h1><p>Rs 1,999</p>';
  assert.deepEqual(analysePageHtml(good, { inSitemap: true }), []);
  const bad =
    '<title>x</title><meta name="robots" content="noindex"><h1>a</h1><h1>b</h1><p>Hi {customerName}, total Rs NaN</p><script>var a={x}</script>';
  const checks = analysePageHtml(bad, { inSitemap: true }).map((i) => i.check);
  assert.ok(checks.includes("Hidden from Google"));
  assert.ok(checks.includes("Unfilled placeholder"));
  assert.ok(checks.includes("Broken value"));
  assert.ok(checks.includes("Heading"));
  // Script contents are not shopper-visible text.
  assert.deepEqual(analysePageHtml('<title>t</title><script>if(a){b}</script>'), []);
});

test("product analysis", () => {
  const issues = analyseProducts([
    { _id: "1", articleNo: "A", status: "active", media: { images: [] }, pricing: { salePrice: 999 }, categories: ["c"] },
    { _id: "2", articleNo: "B", status: "active", media: { images: [{ url: "/x.webp" }] }, pricing: { salePrice: 0 }, categories: ["c"] },
    { _id: "3", articleNo: "C", status: "active", media: { images: [{ url: "/x.webp" }] }, pricing: { salePrice: 5000, regularPrice: 4000 }, categories: [] },
    { _id: "4", articleNo: "D", status: "draft", media: { images: [] }, pricing: { salePrice: 100 } },
    { _id: "5", articleNo: "E", status: "active", media: { images: [{ url: "/y" }] }, pricing: { salePrice: 100 }, categories: ["c"] },
  ]);
  const by = (sku) => issues.filter((i) => i.sku === sku).map((i) => i.check);
  assert.deepEqual(by("A"), ["Live product without photo"]);
  assert.deepEqual(by("B"), ["No price"]);
  assert.deepEqual(by("C"), ["Sale price above regular price", "No category"]);
  assert.deepEqual(by("D"), ["Draft (not on sale)"]);
  assert.deepEqual(by("E"), []);
});

test("sitemap and media URL helpers", () => {
  assert.deepEqual(sitemapLocs("<url><loc> https://x.pk/a </loc></url><loc>https://x.pk/b</loc>"), [
    "https://x.pk/a",
    "https://x.pk/b",
  ]);
  assert.equal(absoluteMediaUrl("/media/p.webp", "https://x.pk"), "https://x.pk/media/p.webp");
  assert.equal(absoluteMediaUrl("https://cdn/p.webp", "https://x.pk"), "https://cdn/p.webp");
});
