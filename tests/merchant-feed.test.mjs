/**
 * Merchant feed — unit guards.
 * Live HTTP: LIVE_FEED_CHECK=1 or `node ops/scripts/check-merchant-feed.mjs`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "path";

await import("./alias-loader.mjs");
const {
  productToMerchantItem,
  buildMerchantRssXml,
} = await import("../storecraft-store/lib/merchantFeed.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const feedSrc = readFileSync(
  path.join(__dirname, "../storecraft-store/lib/merchantFeed.js"),
  "utf8"
);

describe("merchant feed — bulky + pricing", () => {
  it("defines bulky before shipping.service / custom_label_1 (regression for 659a952)", () => {
    assert.match(feedSrc, /const bulky = productIsBulkyForShipping\(product\)/);
    const bulkyIdx = feedSrc.indexOf("const bulky = productIsBulkyForShipping");
    const serviceIdx = feedSrc.indexOf('service: bulky ? "Bulky"');
    assert.ok(bulkyIdx > 0 && serviceIdx > bulkyIdx, "bulky must be declared before use");
  });

  it("productToMerchantItem does not throw and emits sale_price when sale < regular", () => {
    const item = productToMerchantItem(
      {
        articleNo: "CC-TEST-1",
        name: "Test Product",
        slug: "test-product",
        vendor: "CrazzyCars.pk",
        pricing: { regularPrice: 7000, salePrice: 5199, saleSchedule: { enabled: false } },
        inventory: { quantity: 3, trackInventory: true },
        media: { images: [{ url: "/media/products/test-product-1.webp", isMain: true }] },
        categories: [{ name: "Floor Mats" }],
        isBulky: true,
        primaryCategorySlug: "floor-mats",
        tags: ["tpe floor mats"],
        condition: "new",
        codEnabled: true,
      },
      { siteUrl: "https://crazzycars.pk" }
    );
    assert.equal(item.id, "CC-TEST-1");
    assert.equal(item.price, "7000.00 PKR");
    assert.equal(item.sale_price, "5199.00 PKR");
    assert.equal(item.shipping.service, "Bulky");
    assert.equal(item.custom_label_1, "bulky");
    assert.ok(item.image_link.includes("/media/products/test-product-1.webp"));
  });

  it("keeps short brand tokens so MG HS key-cover images score into the feed", () => {
    const item = productToMerchantItem(
      {
        articleNo: "CC-KC5D-MGHS",
        name: "MG HS 5D Zinc-Leather Key Cover",
        slug: "mg-hs-5d-zinc-leather-key-cover",
        vendor: "CrazzyCars.pk",
        pricing: { regularPrice: 2999, salePrice: 2299, saleSchedule: { enabled: false } },
        inventory: { quantity: 5, trackInventory: true },
        media: {
          images: [
            {
              url: "/media/products/kc5d-mg-hs--blue-6f17ae243e.png",
              isMain: true,
            },
          ],
        },
        categories: [{ name: "Key Covers" }],
        condition: "new",
        codEnabled: true,
        seo: { excludeFromMerchantFeed: false },
      },
      { siteUrl: "https://crazzycars.pk" }
    );
    assert.ok(item.image_link, "image_link must not be empty for MG HS");
    assert.ok(item.image_link.includes("kc5d-mg-hs"));
    assert.equal(item.price, "2999.00 PKR");
    assert.equal(item.sale_price, "2299.00 PKR");
  });

  it("buildMerchantRssXml emits items", () => {
    const xml = buildMerchantRssXml([
      {
        id: "X",
        title: "T",
        link: "https://crazzycars.pk/t",
        image_link: "https://crazzycars.pk/media/products/t.webp",
        price: "100.00 PKR",
        availability: "in_stock",
        brand: "CrazzyCars.pk",
        condition: "new",
        description: "d",
        shipping: { country: "PK", service: "Standard", price: "250.00 PKR" },
        custom_label_0: "cod_available",
        custom_label_1: "standard",
        return_policy_label: "7-day-returns",
        google_product_category: "5613",
        identifier_exists: "no",
        additional_image_link: [],
      },
    ]);
    assert.match(xml, /<item>/);
    assert.doesNotMatch(xml, /<title>Error<\/title>/);
  });
});

describe("merchant feed — live HTTP (optional)", () => {
  it("LIVE_FEED_CHECK: /feed/products.xml is 200 with items", async (t) => {
    if (process.env.LIVE_FEED_CHECK !== "1") {
      t.skip("set LIVE_FEED_CHECK=1 to hit production");
      return;
    }
    const res = await fetch("https://crazzycars.pk/feed/products.xml", {
      headers: { "User-Agent": "CrazzyCars-Feed-Check/1.0", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(120_000),
    });
    assert.equal(res.status, 200, `feed HTTP ${res.status}`);
    const body = await res.text();
    const items = (body.match(/<item>/g) || []).length;
    assert.ok(items > 0, "feed must include at least one <item>");
    assert.doesNotMatch(body, /bulky is not defined/);
    assert.doesNotMatch(body, /<title>Error<\/title>/);
  });
});
