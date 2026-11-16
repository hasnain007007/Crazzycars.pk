import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ForbiddenAltError,
  assertCustomerFacingAlt,
  defaultAltForImage,
  findForbiddenAltToken,
  stripReconFromUploadName,
} from "../lib/mediaAltGuard.js";

describe("mediaAltGuard forbidden alt helper", () => {
  it("detects each banned token", () => {
    assert.equal(findForbiddenAltToken("reconstructed product"), "reconstructed");
    assert.equal(findForbiddenAltToken("AI reconstruction pack"), "reconstruction");
    assert.equal(findForbiddenAltToken("product visual shot"), "visual");
    assert.equal(findForbiddenAltToken("with CrazzyCars.pk branding"), "branding");
    assert.equal(findForbiddenAltToken("illustrated trim"), "illustrated");
    assert.equal(findForbiddenAltToken("ai-generated render"), "ai-generated");
    assert.equal(findForbiddenAltToken("ai generated render"), "ai-generated");
    assert.equal(findForbiddenAltToken("Honda Civic Carbon Trim"), null);
  });

  it("assertCustomerFacingAlt throws ForbiddenAltError", () => {
    assert.throws(
      () =>
        assertCustomerFacingAlt(
          "Suzuki Swift — reconstructed product visual with CrazzyCars.pk branding"
        ),
      (err) => err instanceof ForbiddenAltError && err.code === "FORBIDDEN_ALT" && err.status === 400
    );
    assert.doesNotThrow(() => assertCustomerFacingAlt("Suzuki Swift Carbon Fiber Steering Trim"));
  });

  it("defaultAltForImage uses name / name - detail", () => {
    assert.equal(defaultAltForImage("Widget", true), "Widget");
    assert.equal(defaultAltForImage("Widget", false), "Widget - detail");
    assert.equal(defaultAltForImage("", true), "");
  });

  it("stripReconFromUploadName removes -recon- only", () => {
    assert.equal(
      stripReconFromUploadName("suzuki-swift-recon-01-product.webp"),
      "suzuki-swift-01-product.webp"
    );
    assert.equal(
      stripReconFromUploadName("honda-civic-trim-01-product.webp"),
      "honda-civic-trim-01-product.webp"
    );
  });
});
