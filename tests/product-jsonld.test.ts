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
    assert.equal(ld.offers.hasMerchantReturnPolicy.length, 2);
    assert.match(ld.offers.hasMerchantReturnPolicy[0].refundType, /FullRefund$/);
    assert.match(ld.offers.hasMerchantReturnPolicy[1].refundType, /ExchangeRefund$/);
  });
});
