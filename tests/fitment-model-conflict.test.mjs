import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectTitleModelConflict,
  rejectTitleModelConflicts,
  canonicalModelToken,
} from "../storecraft-store/lib/fitment/modelConflict.js";
import {
  classifyCategoryMembership,
  rejectClearCategoryMisfits,
} from "../storecraft-store/lib/fitment/categoryMembership.js";

describe("canonicalModelToken", () => {
  it("resolves Swift / Alto", () => {
    assert.equal(canonicalModelToken("Suzuki", "Swift"), "swift");
    assert.equal(canonicalModelToken("Suzuki", "Alto"), "alto");
  });
});

describe("detectTitleModelConflict", () => {
  const swift = { make: "Suzuki", model: "Swift", slug: "suzuki-swift-2025-present" };

  it("flags Alto-titled product on Swift hub (P0)", () => {
    const hit = detectTitleModelConflict(
      {
        name: "2 Pcs Set Alto 660cc Audi Style Side Fender Indicator in Smoke Color",
        slug: "2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color",
      },
      swift
    );
    assert.equal(hit.conflict, true);
    assert.equal(hit.titleToken, "alto");
    assert.equal(hit.vehicleToken, "swift");
  });

  it("keeps genuine Swift products", () => {
    const hit = detectTitleModelConflict(
      {
        name: "Suzuki Swift 2025-Present Carbon Fiber Side Mirror Covers",
        slug: "carbon-fiber-side-mirror-cover-suzuki-swift-2025-present",
      },
      swift
    );
    assert.equal(hit.conflict, false);
  });

  it("does not invent conflicts for Corolla on Corolla hub", () => {
    const hit = detectTitleModelConflict(
      { name: "Toyota Corolla 2015–2026 Carbon Steering Trim", slug: "x" },
      { make: "Toyota", model: "Corolla" }
    );
    assert.equal(hit.conflict, false);
  });

  it("flags Corolla product title on Aqua hub", () => {
    const hit = detectTitleModelConflict(
      { name: "Toyota Corolla E140 Ducktail Trunk Spoiler", slug: "x" },
      { make: "Toyota", model: "Aqua" }
    );
    assert.equal(hit.conflict, true);
  });

  it("treats Revo as alias of Hilux Revo (no false conflict)", () => {
    const hit = detectTitleModelConflict(
      { name: "Toyota Revo 2016-22 Velvet Dashboard Mat", slug: "x" },
      { make: "Toyota", model: "Hilux Revo" }
    );
    assert.equal(hit.conflict, false);
  });
});

describe("rejectTitleModelConflicts", () => {
  it("drops Alto from Swift listing", () => {
    const { kept, rejected } = rejectTitleModelConflicts(
      [
        { name: "Suzuki Swift Premium Metal Key Cover", slug: "suzuki-swift-premium-metal-key-cover" },
        {
          name: "2 Pcs Set Alto 660cc Audi Style Side Fender Indicator",
          slug: "2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color",
        },
      ],
      { make: "Suzuki", model: "Swift" }
    );
    assert.equal(kept.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(rejected[0].product.slug, /alto/);
  });
});

describe("classifyCategoryMembership splitters", () => {
  it("flags steering trim and ducktail as incorrect", () => {
    assert.equal(
      classifyCategoryMembership(
        { name: "Toyota Corolla 2015–2026 Carbon Steering Trim" },
        "splitters-side-skirts"
      ).status,
      "VERIFIED_INCORRECT"
    );
    assert.equal(
      classifyCategoryMembership(
        { name: "Toyota Corolla E140 2009–2013 Ducktail Trunk Spoiler" },
        "splitters-side-skirts"
      ).status,
      "VERIFIED_INCORRECT"
    );
  });

  it("keeps genuine splitters", () => {
    assert.equal(
      classifyCategoryMembership(
        { name: "Honda Civic X 2016-2021 Side Splitter ABS" },
        "splitters-side-skirts"
      ).status,
      "VERIFIED_CORRECT"
    );
  });

  it("rejectClearCategoryMisfits removes misfits", () => {
    const { kept, rejected } = rejectClearCategoryMisfits(
      [
        { name: "Gloss Black Side Skirts ABS Plastic 4PCS", slug: "a" },
        { name: "Toyota Corolla 2015–2026 Carbon Steering Trim", slug: "b" },
      ],
      "splitters-side-skirts"
    );
    assert.equal(kept.length, 1);
    assert.equal(rejected.length, 1);
  });
});
