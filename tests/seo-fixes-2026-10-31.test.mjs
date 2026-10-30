import { test } from "node:test";
import assert from "node:assert/strict";
import { displayProductName } from "../storecraft-store/lib/displayProductName.js";
import { stripLegacyBrand } from "../storecraft-store/lib/brand.js";
import { productSeoDescription, productSeoTitle } from "../storecraft-store/lib/seo/productSeoMeta.js";
import { aggregateOfferLd, priceRangeSentence } from "../storecraft-store/lib/seo/categoryPriceExtent.js";
import { codAdvanceAmountsLabel } from "../storecraft-store/lib/storePolicyCopy.js";

test("display name drops claim words but keeps the rest", () => {
  assert.equal(displayProductName("Toyota Corolla 2014-2026 TPE Floor Mats Premium"), "Toyota Corolla 2014-2026 TPE Floor Mats");
  assert.equal(displayProductName("Honda CITY 2022 3 Button Premium Metal Key Cover"), "Honda CITY 2022 3 Button Metal Key Cover");
  assert.equal(displayProductName("Genuine OEM Original Steering Butto"), "Steering Button");
  assert.equal(displayProductName("Honda Civic 2012-2015 Front Show Grille Premium Quality"), "Honda Civic 2012-2015 Front Show Grille");
});

test("legacy Sialkot brand is removed from stored car titles, city name elsewhere kept", () => {
  assert.equal(stripLegacyBrand("Suzuki Alto (Old) 2000–2012 Accessories | Sialkot"), "Suzuki Alto (Old) 2000–2012 Accessories");
  assert.equal(stripLegacyBrand("Kia Sportage Accessories | Sialkot Motorsports"), "Kia Sportage Accessories");
  assert.equal(
    stripLegacyBrand("Shop at Sialkot Motorsports. Delivery to Lahore, Sialkot and Karachi.", { replacement: "CrazzyCars.pk" }),
    "Shop at CrazzyCars.pk. Delivery to Lahore, Sialkot and Karachi."
  );
});

test("product title: stored metaTitle → code override → template", () => {
  const override = { title: "Corolla 2014-2026 Floor Mats (Altis/Grande) Price in PK", meta: "override meta" };
  assert.equal(
    productSeoTitle({ name: "x", metaTitle: "Corolla Floor Mats Price in Pakistan", override }),
    "Corolla Floor Mats Price in Pakistan | CrazzyCars.pk"
  );
  assert.equal(productSeoTitle({ name: "x", metaTitle: "", override }), override.title);
  assert.equal(productSeoTitle({ name: "Floor Mats", metaTitle: "" }), "Floor Mats | CrazzyCars.pk");
  const stored = "Corolla 2014-2026 TPE floor mats price in Pakistan. Raised edges, fitted per model year.";
  assert.equal(productSeoDescription({ metaDescription: stored, override }), stored);
  assert.equal(productSeoDescription({ metaDescription: " ", override }), "override meta");
  const long = "x ".repeat(120);
  assert.ok(productSeoDescription({ metaDescription: long }).length <= 160);
});

test("category price range line and AggregateOffer from live prices", () => {
  assert.equal(
    priceRangeSentence("Floor Mats", { min: 1999, max: 7999, n: 12 }),
    "Floor Mats price in Pakistan ranges from Rs 1,999 to Rs 7,999."
  );
  assert.equal(priceRangeSentence("Floor Mats", { min: null, max: null, n: 0 }), null);
  assert.deepEqual(aggregateOfferLd({ min: 1999, max: 7999, n: 12 }), {
    "@type": "AggregateOffer",
    priceCurrency: "PKR",
    lowPrice: 1999,
    highPrice: 7999,
    offerCount: 12,
  });
});

test("COD advance label comes from the tiers", () => {
  assert.equal(codAdvanceAmountsLabel(), "Rs 300 / 600 / 1,000");
});
