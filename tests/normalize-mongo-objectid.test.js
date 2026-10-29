/**
 * Fixture: category parent refs mangled like crazzycars_motorsports clone.
 * Run: node --import ./tests/alias-loader.mjs --test tests/normalize-mongo-objectid.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMongoObjectId,
  normalizeCategoryParentRefs,
} from "../storecraft-store/lib/normalizeMongoObjectId.js";

/** Exterior _id 6a5ccf33eb06d36eb2ac1ae9 as clone-corruption shape from prod logs. */
const EXTERIOR_BUFFER = {
  buffer: {
    0: 106,
    1: 92,
    2: 207,
    3: 51,
    4: 235,
    5: 6,
    6: 211,
    7: 110,
    8: 178,
    9: 172,
    10: 26,
    11: 233,
  },
};

const EXTERIOR_HEX = "6a5ccf33eb06d36eb2ac1ae9";

describe("normalizeMongoObjectId", () => {
  it("recovers hex from { buffer: {0..11} } (prod CastError shape)", () => {
    assert.equal(normalizeMongoObjectId(EXTERIOR_BUFFER), EXTERIOR_HEX);
  });

  it("recovers hex from bare {0..11}", () => {
    assert.equal(normalizeMongoObjectId(EXTERIOR_BUFFER.buffer), EXTERIOR_HEX);
  });

  it("passes through valid hex strings", () => {
    assert.equal(normalizeMongoObjectId(EXTERIOR_HEX), EXTERIOR_HEX);
    assert.equal(normalizeMongoObjectId(EXTERIOR_HEX.toUpperCase()), EXTERIOR_HEX);
  });

  it("returns null for garbage", () => {
    assert.equal(normalizeMongoObjectId(null), null);
    assert.equal(normalizeMongoObjectId({ foo: 1 }), null);
    assert.equal(normalizeMongoObjectId("not-an-id"), null);
  });
});

describe("normalizeCategoryParentRefs fixture (body-kits-extensions)", () => {
  it("repairs parentCategory, parents, ancestors so populate would not CastError", () => {
    const cat = {
      slug: "body-kits-extensions",
      parentCategory: EXTERIOR_BUFFER,
      parents: [EXTERIOR_BUFFER],
      ancestors: [EXTERIOR_BUFFER],
    };
    normalizeCategoryParentRefs(cat);
    assert.equal(cat.parentCategory, EXTERIOR_HEX);
    assert.deepEqual(cat.parents, [EXTERIOR_HEX]);
    assert.deepEqual(cat.ancestors, [EXTERIOR_HEX]);
  });
});
