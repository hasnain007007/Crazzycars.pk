import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  formatVariationName,
  isColorVariationName,
  isSwatchVariation,
  resolveSwatchHex,
  swatchNeedsRing,
  variationTagLabel,
} from "../storecraft-store/lib/colorSwatch.js";

describe("color swatch mapping", () => {
  test("treats Color / Colour / Finish / Design as swatch axes", () => {
    assert.equal(isColorVariationName("Color"), true);
    assert.equal(isColorVariationName("colour"), true);
    assert.equal(isColorVariationName("Finish"), true);
    assert.equal(isColorVariationName("Design"), true);
    assert.equal(isColorVariationName("Size"), false);
  });

  test("uses circles when every tag is a colour, pills otherwise", () => {
    assert.equal(isSwatchVariation("colour", ["red", "silver", "Yellow"]), true);
    assert.equal(isSwatchVariation("Style", ["Gloss Black"]), true);
    assert.equal(isSwatchVariation("Side Skirts", ["Gloss Black", "Red Line"]), true);
    assert.equal(isSwatchVariation("size", ["small", "Medium", "Large"]), false);
    assert.equal(isSwatchVariation("Style", ["a"]), false);
  });

  test("pretty-prints axis names", () => {
    assert.equal(formatVariationName("colour"), "Color");
    assert.equal(formatVariationName("size"), "Size");
  });

  test("maps common car-shop names to hex", () => {
    assert.equal(resolveSwatchHex("Yellow"), "#F5C400");
    assert.equal(resolveSwatchHex("Red"), "#DC2626");
    assert.equal(resolveSwatchHex("White"), "#FFFFFF");
    assert.equal(resolveSwatchHex("Gloss Black"), "#111111");
    assert.equal(resolveSwatchHex("Carbon Fiber"), "#1F1F1F");
    assert.equal(resolveSwatchHex("#abc"), "#abc");
  });

  test("light fills need a hairline so they show on white", () => {
    assert.equal(swatchNeedsRing("#FFFFFF"), true);
    assert.equal(swatchNeedsRing("#DC2626"), false);
  });

  test("reads string or object tags", () => {
    assert.equal(variationTagLabel("Yellow"), "Yellow");
    assert.equal(variationTagLabel({ value: "Red" }), "Red");
  });
});
