import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProductPricing } from "../storecraft-admin/lib/productPriceRules.js";
import { catalogModelsByMake, normalizeFitmentModel } from "../storecraft-admin/lib/fitmentModelNormalize.js";
import { planProduct } from "../scripts/fix-catalog-2026-10.mjs";
import { runCatalogChecks } from "../scripts/catalog/catalogChecks.mjs";

const makes = [
  {
    name: "Toyota",
    models: [
      { _id: "g1", name: "Corolla", generation: "E140", yearFrom: 2009, yearTo: 2014 },
      { _id: "g2", name: "Corolla", generation: "E170–E210", yearFrom: 2014, yearTo: 2026 },
      { _id: "g3", name: "Mark X", generation: "1st Gen (X120)", yearFrom: 2004, yearTo: 2011 },
    ],
  },
  {
    name: "Hyundai",
    models: [
      { _id: "h1", name: "Elantra", generation: "CN7", yearFrom: 2020, yearTo: 2024 },
      { _id: "h2", name: "Elantra Hybrid", generation: "CN7 Facelift", yearFrom: 2025, yearTo: 2026 },
    ],
  },
];
const byMake = catalogModelsByMake(makes);
const toyota = byMake.get("toyota");

test("price rules: whole rupees, sale strictly between 0 and regular, 0 = no sale", () => {
  assert.equal(validateProductPricing({ regularPrice: 5999.03 }).ok, false);
  assert.equal(validateProductPricing({ regularPrice: 6499, salePrice: 8500 }).ok, false);
  assert.equal(validateProductPricing({ regularPrice: 800, salePrice: 800 }).ok, false);
  assert.equal(validateProductPricing({ regularPrice: 800, salePrice: -1 }).ok, false);
  assert.equal(validateProductPricing({ regularPrice: 800, salePrice: 799.5 }).ok, false);
  assert.deepEqual(validateProductPricing({ regularPrice: 1599, salePrice: 0 }), { ok: true, regularPrice: 1599, salePrice: undefined });
  assert.deepEqual(validateProductPricing({ regularPrice: 12000, salePrice: "9999" }), { ok: true, regularPrice: 12000, salePrice: 9999 });
});

test("fitment: generation code in model → catalog model + generation", () => {
  const r = normalizeFitmentModel({ make: "Toyota", model: "E170–E210", yearFrom: 2014, yearTo: 2026 }, toyota);
  assert.equal(r.model, "Corolla");
  assert.equal(r.generation, "E170–E210");
  assert.equal(normalizeFitmentModel({ make: "Toyota", model: "1 Gen(X120)", yearFrom: 2004, yearTo: 2011 }, toyota).model, "Mark X");
  const h = normalizeFitmentModel(
    { make: "Hyundai", model: "hyundai-elantra-hybrid-2025-present-CN7 Facelift", yearFrom: 2025, yearTo: 2026 },
    byMake.get("hyundai")
  );
  assert.equal(h.model, "Elantra Hybrid");
  assert.equal(normalizeFitmentModel({ make: "Toyota", model: "Corolla", yearFrom: 2014 }, toyota).changed, false);
  assert.equal(normalizeFitmentModel({ make: "Toyota", model: "Prado", yearFrom: 2009, yearTo: 2023 }, toyota).changed, false);
});

const ctx = {
  byMake,
  vehicles: [{ _id: "v2", make: "Toyota", model: "Corolla", yearFrom: 2014, yearTo: null }],
  vehicleName: new Map(),
  catBySlug: new Map([["led-indicator-lights", "c2"], ["multimedia-steering-controls", "c1"]]),
  catSlug: new Map([["c1", "multimedia-steering-controls"], ["c2", "led-indicator-lights"]]),
};

function applySet(p, set) {
  const next = structuredClone(p);
  for (const [k, v] of Object.entries(set)) {
    const parts = k.split(".");
    let o = next;
    while (parts.length > 1) o = o[parts.shift()] ??= {};
    o[parts[0]] = structuredClone(v);
  }
  return next;
}

test("fix plan rounds prices, normalises fitment, moves categories — and is idempotent", () => {
  const product = {
    _id: "p1",
    articleNo: "CC-0015",
    slug: "x",
    name: "Toyota Corolla RGB Side Mirror Indicator",
    pricing: { regularPrice: 5999.03, salePrice: 4999.98 },
    categories: ["c1"],
    vehicleCompatibility: { fitmentType: "specific", vehicles: [{ make: "Toyota", model: "E170–E210", yearFrom: 2014, yearTo: 2026 }] },
    compatibleVehicles: [],
  };
  const plan = planProduct(product, ctx);
  assert.equal(plan.set["pricing.regularPrice"], 5999);
  assert.equal(plan.set["pricing.salePrice"], 5000);
  assert.equal(plan.set["vehicleCompatibility.vehicles"][0].model, "Corolla");
  assert.equal(plan.set.compatibleCars[0].generationLabel, "E170–E210");
  assert.deepEqual(plan.set.compatibleVehicles, ["v2"]);
  assert.deepEqual(plan.set.categories, ["c2"]);

  const again = planProduct(applySet(product, plan.set), ctx);
  assert.deepEqual(again.changes, []);
});

test("fix plan keeps existing car-page links (adds, never removes)", () => {
  const plan = planProduct(
    {
      _id: "p2",
      articleNo: "CC-X",
      name: "Corolla mat",
      pricing: { regularPrice: 1000 },
      vehicleCompatibility: { vehicles: [{ make: "Toyota", model: "E170–E210", yearFrom: 2014, yearTo: 2026 }] },
      compatibleVehicles: ["manual-link"],
    },
    ctx
  );
  assert.deepEqual(plan.set.compatibleVehicles, ["manual-link", "v2"]);
});

test("checks flag shared images, wrong car in fitment and sale above regular", () => {
  const img = { media: { images: [{ url: "/media/products/osram-projector-lights-1-04518dd4fc.webp", isMain: true }] } };
  const issues = runCatalogChecks({
    catalogMakes: makes,
    products: [
      { status: "active", articleNo: "A", slug: "osram-projector-lights", name: "OSRAM Projector Lights", pricing: { regularPrice: 2000 }, categories: ["c"], ...img },
      {
        status: "active",
        articleNo: "B",
        slug: "honda-vezel-drl-cover",
        name: "Toyota Corolla Grille",
        pricing: { regularPrice: 6499, salePrice: 8500 },
        categories: ["c"],
        vehicleCompatibility: { fitmentType: "specific", vehicles: [{ make: "Toyota", model: "Mark X", yearFrom: 2004, yearTo: 2011 }] },
        ...img,
      },
    ],
  });
  const types = (sku) => issues.filter((i) => i.sku === sku).map((i) => i.type);
  assert.ok(types("A").includes("image_shared"));
  assert.ok(types("B").includes("image_name_mismatch"));
  assert.ok(types("B").includes("price_sale_not_lower"));
  assert.ok(types("B").includes("title_fitment_mismatch"));
});
