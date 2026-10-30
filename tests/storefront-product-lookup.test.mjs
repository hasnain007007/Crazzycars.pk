import { test } from "node:test";
import assert from "node:assert/strict";
import { STOREFRONT_PRODUCT_FILTER, storefrontProductLookup } from "../storecraft-store/lib/productVisibility.js";

test("product lookup keeps the requested slug (shared filter must not overwrite it)", () => {
  const f = storefrontProductLookup("haval-h6-batman-style-side-mirror-cover");
  assert.equal(f.slug.$eq, "haval-h6-batman-style-side-mirror-cover");
  assert.deepEqual(f.slug.$nin, STOREFRONT_PRODUCT_FILTER.slug.$nin);
  assert.equal(f.status, "active");
  assert.deepEqual(f.securityHold, { $ne: true });
});

test("a Mongo id matches by _id or slug", () => {
  const f = storefrontProductLookup("6a5d224689c0c8d16c691f9b");
  assert.equal(f.$or.length, 2);
  assert.equal(f.$or[1]._id, "6a5d224689c0c8d16c691f9b");
});
