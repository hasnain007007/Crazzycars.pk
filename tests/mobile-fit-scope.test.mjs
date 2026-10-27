/**
 * Garage fit scopes: exact-fit vs universal vs both (no Mongo required).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "../scripts/ab-checkout/alias-loader.mjs")).href);

const { fitScopeFilter, universalProductsFilter, FIT_SCOPES } = await import(
  "../storecraft-store/lib/mobile/fitsVehicle.js"
);

const vehicle = {
  _id: "6a5ea45689c0c8d16c69644d",
  make: "Toyota",
  model: "Corolla",
  generation: "E120",
  yearFrom: 2002,
  yearTo: 2008,
};

describe("fitScopeFilter", () => {
  it("lists the three scopes", () => {
    assert.deepEqual(FIT_SCOPES, ["specific", "universal", "all"]);
  });

  it("specific keeps the exact-fit $or inside $and and no universal clause", () => {
    const f = fitScopeFilter(vehicle, "specific");
    assert.equal(f.$or, undefined);
    const branches = f.$and[0].$or;
    assert.ok(branches.some((b) => String(b.compatibleVehicles) === vehicle._id));
    assert.ok(!branches.some((b) => b.isUniversal === true));
  });

  it("universal is only the universal clauses", () => {
    assert.deepEqual(fitScopeFilter(vehicle, "universal"), universalProductsFilter());
  });

  it("all adds universal clauses to the exact-fit ones", () => {
    const branches = fitScopeFilter(vehicle, "all").$and[0].$or;
    assert.ok(branches.some((b) => String(b.compatibleVehicles) === vehicle._id));
    assert.ok(branches.some((b) => b.isUniversal === true));
    assert.ok(branches.some((b) => b["vehicleCompatibility.fitmentType"] === "universal"));
  });
});
