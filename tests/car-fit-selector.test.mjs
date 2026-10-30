import { test } from "node:test";
import assert from "node:assert/strict";
import { carOptionLabel, groupVehiclesForSelect, resolveCarSlug } from "../storecraft-store/lib/carSelector.js";

const cars = [
  { slug: "toyota-corolla-e170-2014-2026", make: "Toyota", model: "Corolla", generation: "E170–E210", yearFrom: 2014, yearTo: null },
  { slug: "toyota-corolla-e140-2009-2014", make: "Toyota", model: "Corolla", generation: "E140", yearFrom: 2009, yearTo: 2014 },
  { slug: "honda-civic-x-2016-2021", make: "Honda", model: "Civic", generation: "Civic X", yearFrom: 2016, yearTo: 2021 },
];

test("?car= resolves only known car slugs (case-insensitive), rejects junk", () => {
  assert.equal(resolveCarSlug("toyota-corolla-e170-2014-2026", cars), "toyota-corolla-e170-2014-2026");
  assert.equal(resolveCarSlug("TOYOTA-COROLLA-E140-2009-2014", cars), "toyota-corolla-e140-2009-2014");
  assert.equal(resolveCarSlug("toyota-supra", cars), null);
  assert.equal(resolveCarSlug("<script>", cars), null);
  assert.equal(resolveCarSlug("", cars), null);
});

test("options grouped by make, models by year, labels show generation + years", () => {
  const groups = groupVehiclesForSelect(cars);
  assert.deepEqual(groups.map((g) => g.make), ["Honda", "Toyota"]);
  assert.deepEqual(groups[1].options.map((o) => o.slug), ["toyota-corolla-e140-2009-2014", "toyota-corolla-e170-2014-2026"]);
  assert.equal(carOptionLabel(cars[0]), "Corolla E170–E210 (2014–Present)");
  assert.equal(carOptionLabel(cars[2]), "Civic X (2016–2021)");
});
