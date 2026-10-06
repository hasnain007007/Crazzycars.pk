import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isCompleteProductJsonLd,
  productJsonLd,
} from "../storecraft-store/lib/seo/jsonld.js";

describe("product JSON-LD", () => {
  test("omits $0 offers and empty image arrays", () => {
    const ld = productJsonLd({
      name: "No photo SKU",
      slug: "no-photo-sku",
      images: [],
      price: 0,
      salePrice: 0,
    });
    assert.equal(ld["@type"], "Product");
    assert.equal(ld.image, undefined);
    assert.equal(ld.offers, undefined);
    assert.equal(isCompleteProductJsonLd(ld), false);
  });

  test("skips dead Cloudinary URLs so incomplete schema is not emitted", () => {
    const ld = productJsonLd({
      name: "Legacy Cloudinary SKU",
      slug: "legacy-cloudinary-sku",
      images: [
        "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/trim.jpg",
      ],
      price: 999,
      stock: 4,
      brand: "CrazzyCars.pk",
    });
    assert.equal(ld.image, undefined);
    assert.equal(isCompleteProductJsonLd(ld), false);
  });

  test("emits shoppable Product with local /media images", () => {
    const ld = productJsonLd({
      name: "Honda Vezel 2013-2018 PVC Trunk Mat",
      slug: "honda-vezel-2013-2018-pvc-trunk-mat",
      media: {
        images: [
          {
            url: "https://crazzycars.pk/media/products/honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp",
            isMain: true,
          },
        ],
      },
      price: 4599,
      stock: 4,
      brand: "CrazzyCars.pk",
    });
    assert.equal(isCompleteProductJsonLd(ld), true);
    assert.deepEqual(ld.image, [
      "https://crazzycars.pk/media/products/honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp",
    ]);
    assert.equal(ld.offers.price, "4599.00");
    assert.equal(ld.offers.priceCurrency, "PKR");
    assert.equal(ld.offers.shippingDetails["@type"], "OfferShippingDetails");
    assert.equal(ld.offers.shippingDetails.shippingRate.value, "250.00");
    assert.equal(ld.offers.acceptedPaymentMethod, undefined);
    assert.equal(ld.offers.hasMerchantReturnPolicy, undefined);
  });

  test("bulky products emit Rs 500 shipping in Offer", () => {
    const ld = productJsonLd({
      name: "Body Kit",
      slug: "test-body-kit",
      isBulky: true,
      media: {
        images: [{ url: "https://crazzycars.pk/media/products/x.webp", isMain: true }],
      },
      price: 50000,
      stock: 2,
    });
    assert.equal(ld.offers.shippingDetails.shippingRate.value, "500.00");
  });

  test("seed / empty-orderId reviews do not appear in AggregateRating", () => {
    const ld = productJsonLd({
      name: "Reviewed SKU",
      slug: "reviewed-sku",
      media: {
        images: [{ url: "https://crazzycars.pk/media/products/x.webp", isMain: true }],
      },
      price: 1000,
      stock: 1,
      reviews: [
        {
          status: "approved",
          source: "import",
          orderId: "",
          rating: 5,
          body: "seed",
          reviewer: { name: "Bot", email: "a@crazzycars.local" },
        },
        {
          status: "approved",
          source: "customer",
          orderId: "ORD-1",
          isSeed: false,
          rating: 4,
          body: "real",
          reviewer: { name: "Ali" },
          createdAt: "2026-10-01",
        },
      ],
    });
    assert.equal(ld.aggregateRating.reviewCount, "1");
    assert.equal(ld.review.length, 1);
    assert.match(ld.review[0].reviewBody, /real/);
  });
});
