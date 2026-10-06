import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  exclusiveYearOverlap,
  resolveGenerationId,
} from "../storecraft-store/lib/fitmentGeneration.js";

const CIVIC = [
  {
    _id: "gen-reborn",
    name: "Civic",
    model: "Civic",
    generation: "Reborn",
    nickname: "Civic Reborn",
    yearFrom: 2006,
    yearTo: 2012,
  },
  {
    _id: "gen-rebirth",
    name: "Civic",
    model: "Civic",
    generation: "Rebirth",
    nickname: "Civic Rebirth",
    yearFrom: 2012,
    yearTo: 2016,
  },
  {
    _id: "gen-x",
    name: "Civic",
    model: "Civic",
    generation: "Civic X",
    nickname: "Civic X",
    yearFrom: 2016,
    yearTo: 2021,
  },
  {
    _id: "gen-11",
    name: "Civic",
    model: "Civic",
    generation: "11th Gen",
    nickname: "Civic 11th Gen",
    yearFrom: 2022,
    yearTo: null,
  },
];

const COROLLA = [
  {
    _id: "e140",
    name: "Corolla",
    model: "Corolla",
    generation: "E140",
    nickname: "E140",
    yearFrom: 2009,
    yearTo: 2014,
  },
  {
    _id: "e170",
    name: "Corolla",
    model: "Corolla",
    generation: "E170–E210",
    nickname: "E170",
    yearFrom: 2014,
    yearTo: 2026,
  },
  {
    _id: "cross",
    name: "Corolla Cross",
    model: "Corolla Cross",
    generation: "",
    nickname: "Cross",
    yearFrom: 2020,
    yearTo: null,
  },
];

describe("exclusiveYearOverlap", () => {
  it("rejects adjacent gens that only share a boundary year", () => {
    const r = exclusiveYearOverlap(2009, 2014, 2014, 2026);
    assert.equal(r.overlaps, false);
    assert.equal(r.years, 1);
  });

  it("accepts ≥2 year overlap", () => {
    const r = exclusiveYearOverlap(2014, 2018, 2014, 2026);
    assert.equal(r.overlaps, true);
    assert.ok(r.years >= 2);
  });

  it("accepts single-year full containment (exclusive boundary)", () => {
    const r = exclusiveYearOverlap(2014, 2014, 2014, 2026);
    assert.equal(r.overlaps, true);
    assert.equal(r.exclusiveBoundary, true);
  });
});

describe("resolveGenerationId", () => {
  it("resolves Civic X by year overlap", () => {
    const r = resolveGenerationId("Honda", "Civic", 2016, 2021, CIVIC);
    assert.equal(r.unmatched, false);
    assert.equal(r.generationId, "gen-x");
    assert.equal(r.confidence, "exact");
  });

  it("resolves by nickname without defaulting to first gen", () => {
    const r = resolveGenerationId("Honda", "Reborn", 2006, 2012, CIVIC);
    assert.equal(r.generationId, "gen-reborn");
    assert.equal(r.unmatched, false);
  });

  it("does not silently pick the first Civic when years are missing", () => {
    const r = resolveGenerationId("Honda", "Civic", null, null, CIVIC);
    assert.equal(r.unmatched, true);
    assert.equal(r.generationId, null);
    assert.ok(Array.isArray(r.matches) && r.matches.length > 1);
  });

  it("returns unmatched for multi-span year ranges across gens", () => {
    const r = resolveGenerationId("Honda", "Civic", 2010, 2020, CIVIC);
    assert.equal(r.unmatched, true);
    assert.equal(r.generationId, null);
    assert.ok(r.matches.length >= 2);
  });

  it("does not bleed E140 onto E170 via boundary year", () => {
    const r = resolveGenerationId("Toyota", "Corolla", 2009, 2014, COROLLA);
    assert.equal(r.generationId, "e140");
    assert.equal(r.unmatched, false);
  });

  it("resolves E170 uniquely", () => {
    const r = resolveGenerationId("Toyota", "Corolla", 2015, 2023, COROLLA);
    assert.equal(r.generationId, "e170");
    assert.equal(r.unmatched, false);
  });

  it("does not match Corolla Cross when model is Corolla", () => {
    const r = resolveGenerationId("Toyota", "Corolla", 2020, 2024, COROLLA);
    assert.equal(r.generationId, "e170");
    assert.notEqual(r.generationId, "cross");
  });

  it("returns unmatched when catalog is empty", () => {
    const r = resolveGenerationId("Honda", "Civic", 2018, 2019, []);
    assert.equal(r.unmatched, true);
    assert.equal(r.generationId, null);
  });
});
