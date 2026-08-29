import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isEmptyLeafCategory } from "../storecraft-store/lib/emptyLeafCategory.js";

describe("soft 404 guards", () => {
  test("empty leaf category is a Soft 404 candidate", () => {
    assert.equal(isEmptyLeafCategory({ productCount: 0, subcategories: [] }), true);
    assert.equal(isEmptyLeafCategory({ productCount: 0 }), true);
    assert.equal(isEmptyLeafCategory({ productCount: 0, subcategories: [{ slug: "led" }] }), false);
    assert.equal(isEmptyLeafCategory({ productCount: 3, subcategories: [] }), false);
    assert.equal(isEmptyLeafCategory(null), false);
  });
});
