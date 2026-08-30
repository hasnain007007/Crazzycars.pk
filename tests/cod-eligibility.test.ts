import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isBodyKitProduct, productAllowsCod } from "../storecraft-store/lib/codEligibility.js";

describe("body kit COD block", () => {
  test("blocks full body kits", () => {
    assert.equal(
      isBodyKitProduct({
        name: "Suzuki Swift 2022-2024 RS Style Body Kit Fibreglass",
        slug: "suzuki-swift-2022-2024-rs-style-body-kit-fibreglass",
      }),
      true
    );
    assert.equal(isBodyKitProduct({ name: "Complete Body Kit – Front Splitter Side Skirts Rear Lip" }), true);
    assert.equal(isBodyKitProduct({ name: "Toyota Aqua 2016-2019 Front Body Kit Fibreglass" }), true);
  });

  test("does not treat LED underbody or bumpers as body kits", () => {
    assert.equal(isBodyKitProduct({ name: "Dynamic Car Underglow RGB LED Underbody Kit" }), false);
    assert.equal(isBodyKitProduct({ name: "Honda Civic X Rear Bumper Diffuser Gloss Black" }), false);
    assert.equal(isBodyKitProduct({ name: "Toyota Corolla X 2017-2020 Front Bumper Replacement" }), false);
  });

  test("body kits never allow COD even if the flag is on", () => {
    assert.equal(
      productAllowsCod({
        name: "Honda Civic X 2016-2021 Body Kit D1",
        codEnabled: true,
      }),
      false
    );
    assert.equal(productAllowsCod({ name: "Bright LED Indicator Bulbs", codEnabled: true }), true);
    assert.equal(productAllowsCod({ name: "Bright LED Indicator Bulbs", codEnabled: false }), false);
  });
});
