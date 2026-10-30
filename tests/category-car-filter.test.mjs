import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVehiclePageProductFilter } from "../storecraft-store/lib/productVehicleQuery.js";

test("category ?car= filter = category query AND the car-page fitment filter", () => {
  const vehicle = { _id: "veh1", make: "Toyota", model: "Corolla", yearFrom: 2014, yearTo: null };
  const carFilter = buildVehiclePageProductFilter(vehicle);
  // Same composition as loadStoreCategoryDetail({ extraFilter }).
  const categoryQuery = { status: "active", $or: [{ categories: { $in: ["c1"] } }] };
  const productQuery = { $and: [categoryQuery, carFilter] };
  assert.equal(productQuery.$and.length, 2);
  assert.ok(carFilter.$or.some((c) => c.compatibleVehicles === "veh1"), "matches products linked to the car page");
  assert.equal(carFilter.status, "active");
});
