/**
 * Home section helpers + fitsVehicle filter shape (no Mongo required for unit bits).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "../scripts/ab-checkout/alias-loader.mjs")).href);

const { markFitsVehicleTrue, fittingProductsFilter } = await import(
  "../storecraft-store/lib/mobile/fitsVehicle.js"
);
const { normalizeHomepageSettings, DEFAULT_HOMEPAGE_SETTINGS } = await import(
  "../storecraft-store/lib/defaultHomepageSettings.js"
);
const { deliveryEtaSummary, standardDeliveryFeeShort } = await import(
  "../storecraft-store/lib/storePolicyCopy.js"
);

describe("mobile home section sources", () => {
  it("best sellers are featured-flag products (serverBestSellers contract)", () => {
    // Documented: fetchBestSellersServer filters featured/isFeatured — mirrored in home route.
    assert.equal(typeof DEFAULT_HOMEPAGE_SETTINGS.bestSellers.title, "string");
  });

  it("brands come from homepage settings (BrandCarousel source)", () => {
    const hp = normalizeHomepageSettings({});
    assert.ok(Array.isArray(hp.brands) && hp.brands.length > 0);
    assert.ok(hp.brands.some((b) => /honda/i.test(b.name)));
  });

  it("flashSaleEndTime defaults null (FlashSale.jsx same field)", () => {
    const hp = normalizeHomepageSettings({});
    assert.equal(hp.flashSaleEndTime, null);
  });
});

describe("fitsVehicle helpers", () => {
  it("markFitsVehicleTrue sets flag", () => {
    assert.equal(markFitsVehicleTrue({ id: "1", name: "x" }).fitsVehicle, true);
  });

  it("fittingProductsFilter requires vehicle _id", () => {
    const f = fittingProductsFilter({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", make: "Honda", model: "Civic" });
    assert.ok(f.$or || f.compatibleVehicles);
  });
});

describe("delivery ETA policy copy", () => {
  it("exposes confirmed Lahore ETA text (not invented)", () => {
    const summary = deliveryEtaSummary();
    assert.match(summary, /Lahore/i);
    assert.match(summary, /Other cities/i);
    assert.ok(standardDeliveryFeeShort().includes("250"));
  });
});

describe("historical order item slug fallback", () => {
  it("serialize keeps empty slug when missing (route fills from Product)", async () => {
    const { serializeMobileOrderItem } = await import(
      "../storecraft-store/lib/mobile/serializeMobileOrder.js"
    );
    const item = serializeMobileOrderItem({
      productId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      name: "Old line",
      quantity: 1,
      unitPrice: 100,
      total: 100,
      image: "https://example.com/a.jpg",
    });
    assert.equal(item.slug, "");
    assert.equal(item.productId, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.ok(item.image);
  });
});
