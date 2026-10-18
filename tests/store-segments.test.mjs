/**
 * Cars / Bikes store segments and the bike catalog seed (no Mongo required).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterCategoryTreeBySegment,
  parseSegment,
  segmentFilter,
  segmentOf,
} from "../storecraft-store/lib/segment.js";

describe("segment helpers", () => {
  it("parses only known segments", () => {
    assert.equal(parseSegment("bike"), "bike");
    assert.equal(parseSegment(" CAR "), "car");
    assert.equal(parseSegment("boat"), null);
    assert.equal(parseSegment(undefined), null);
  });

  it("treats documents without a segment as cars", () => {
    assert.deepEqual(segmentFilter("car"), { segment: { $in: ["car", null] } });
    assert.deepEqual(segmentFilter("bike"), { segment: "bike" });
    assert.deepEqual(segmentFilter(null), {});
    assert.equal(segmentOf({}), "car");
    assert.equal(segmentOf({ segment: "bike" }), "bike");
  });

  it("filters top-level categories by store and keeps children with their parent", () => {
    const tree = [
      { name: "Exterior", children: [{ name: "Spoilers" }] },
      { name: "Helmets", segment: "bike", children: [{ name: "Full face" }] },
    ];
    assert.deepEqual(
      filterCategoryTreeBySegment(tree, "car").map((n) => n.name),
      ["Exterior"]
    );
    const bikes = filterCategoryTreeBySegment(tree, "bike");
    assert.deepEqual(bikes.map((n) => n.name), ["Helmets"]);
    assert.equal(bikes[0].children.length, 1);
    assert.equal(filterCategoryTreeBySegment(tree, null), tree);
  });
});

describe("bike catalog seed", async () => {
  const { BIKES, BIKE_CATEGORIES, bikeVehicleDoc, slugify } = await import(
    "../storecraft-store/scripts/vehicles/seedBikeCatalog.mjs"
  );

  it("writes bike vehicles with unique slugs that cannot clash with car slugs", () => {
    const docs = BIKES.map(bikeVehicleDoc);
    assert.ok(docs.every((d) => d.segment === "bike" && d.slug.startsWith("bike-")));
    assert.equal(new Set(docs.map((d) => d.slug)).size, docs.length);
    assert.equal(docs[0].slug, "bike-honda-cd-70");
    assert.equal(docs[0].displayName, "Honda CD 70 (2004–present)");
  });

  it("leads with the best-selling makes", () => {
    assert.equal(BIKES[0].make, "Honda");
    assert.ok(BIKES.some((b) => b.make === "United"));
  });

  it("slugifies bike category names", () => {
    assert.equal(slugify("Helmets & Riding Gear"), "helmets-and-riding-gear");
    assert.equal(new Set(BIKE_CATEGORIES.map(slugify)).size, BIKE_CATEGORIES.length);
  });
});
