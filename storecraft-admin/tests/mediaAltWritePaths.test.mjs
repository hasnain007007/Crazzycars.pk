import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ForbiddenAltError,
  applyCustomerFacingAlts,
} from "../lib/mediaAltGuard.js";

const product = {
  name: "Suzuki Swift 2022–2026 Carbon Fiber Steering Trim",
  slug: "suzuki-swift-2022-2026-carbon-fiber-steering-trim",
};

const forbiddenAlt =
  "Suzuki Swift 2022–2026 Carbon Fiber Steering Trim — reconstructed product visual with CrazzyCars.pk branding";

/** create / update / gallery save all use mode:"reject" via sanitizeMediaImages */
describe("write paths: create / update / gallery (reject)", () => {
  it("create/update/gallery reject forbidden alt with clear error", () => {
    assert.throws(
      () =>
        applyCustomerFacingAlts(
          [
            {
              url: "https://crazzycars.pk/media/products/a.webp",
              isMain: true,
              altText: forbiddenAlt,
            },
          ],
          product,
          { mode: "reject" }
        ),
      (err) =>
        err instanceof ForbiddenAltError &&
        /reconstructed|not allowed/i.test(err.message) &&
        err.code === "FORBIDDEN_ALT"
    );
  });

  it("create path defaults empty alts to product name / name - detail", () => {
    const { images } = applyCustomerFacingAlts(
      [
        { url: "https://crazzycars.pk/media/products/a.webp", isMain: true, altText: "" },
        { url: "https://crazzycars.pk/media/products/b.webp", isMain: false, altText: "" },
      ],
      product,
      { mode: "reject" }
    );
    assert.equal(images[0].altText, product.name);
    assert.equal(images[1].altText, `${product.name} - detail`);
  });

  it("update/gallery path keeps a valid custom alt", () => {
    const { images } = applyCustomerFacingAlts(
      [
        {
          url: "https://crazzycars.pk/media/products/a.webp",
          isMain: true,
          altText: "Suzuki Swift Carbon Fiber Steering Trim installed",
        },
      ],
      product,
      { mode: "reject" }
    );
    assert.equal(images[0].altText, "Suzuki Swift Carbon Fiber Steering Trim installed");
  });
});

describe("write path: CSV autofix + log", () => {
  it("autofixes forbidden alt to product name and lists every change", () => {
    const { images, altFixes } = applyCustomerFacingAlts(
      [
        {
          url: "https://crazzycars.pk/media/products/a.webp",
          isMain: true,
          altText: forbiddenAlt,
        },
        {
          url: "https://crazzycars.pk/media/products/b.webp",
          isMain: false,
          altText:
            "Suzuki Swift — reconstructed fitted detail visual with CrazzyCars.pk branding",
        },
      ],
      product,
      { mode: "csv" }
    );
    assert.equal(images[0].altText, product.name);
    assert.equal(images[1].altText, product.name);
    assert.equal(altFixes.length, 2);
    assert.equal(altFixes[0].before, forbiddenAlt);
    assert.equal(altFixes[0].after, product.name);
    assert.ok(altFixes[0].token);
    assert.equal(altFixes[1].index, 1);
  });

  it("CSV leaves clean alts unchanged with empty fix log", () => {
    const { images, altFixes } = applyCustomerFacingAlts(
      [
        {
          url: "https://crazzycars.pk/media/products/a.webp",
          isMain: true,
          altText: product.name,
        },
      ],
      product,
      { mode: "csv" }
    );
    assert.equal(images[0].altText, product.name);
    assert.deepEqual(altFixes, []);
  });
});
