#!/usr/bin/env node
/**
 * Backfill Product.compatibleCars / vehicleCompatibility.vehicles generationId
 * from Car Catalog nested model ObjectIds (year-range exclusive overlap).
 *
 * SAFETY: refuses production Mongo URIs unless --allow-production is passed.
 * Default is dry-run (no writes). Pass --apply to write.
 *
 * Usage (from repo root or storecraft-store):
 *   node --env-file=storecraft-store/.env.local scripts/backfill-fitment-generation-ids.mjs
 *   node --env-file=storecraft-store/.env.local scripts/backfill-fitment-generation-ids.mjs --apply
 *
 * Do NOT run against production DB.
 */
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const apply = process.argv.includes("--apply");
const allowProduction = process.argv.includes("--allow-production");

function isProductionUri(uri) {
  const u = String(uri || "").toLowerCase();
  if (!u) return false;
  if (u.includes("localhost") || u.includes("127.0.0.1")) return false;
  // Heuristic: common prod cluster / db name markers
  if (/sialkot|crazzycars|production|prod|atlas/.test(u) && !/test|staging|dev|local/.test(u)) {
    return true;
  }
  return false;
}

async function loadResolve() {
  const modPath = path.join(root, "storecraft-store/lib/fitmentGeneration.js");
  return import(pathToFileURL(modPath).href);
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!uri) {
    console.error("Set MONGODB_URI or MONGO_URI (use a non-production DB).");
    process.exit(1);
  }
  if (isProductionUri(uri) && !allowProduction) {
    console.error(
      "Refusing to run against a suspected production Mongo URI.\n" +
        "Use a local/staging DB, or pass --allow-production only if you intend to."
    );
    process.exit(1);
  }

  const { resolveGenerationId } = await loadResolve();

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const makes = await db.collection("carcatalogs").find({}).toArray();
  const catalogByMake = new Map();
  for (const make of makes) {
    const name = String(make.name || "").trim();
    if (!name) continue;
    const models = (make.models || [])
      .filter((m) => m && m.isActive !== false)
      .map((m) => ({
        _id: m._id,
        name: m.name,
        model: m.name,
        generation: m.generation || "",
        nickname: m.nickname || "",
        yearFrom: m.yearFrom,
        yearTo: m.yearTo,
        years: m.years,
        slug: m.slug,
      }));
    catalogByMake.set(name.toLowerCase(), models);
    catalogByMake.set(name, models);
  }

  const products = await db
    .collection("products")
    .find({})
    .project({
      _id: 1,
      slug: 1,
      name: 1,
      compatibleCars: 1,
      vehicleCompatibility: 1,
    })
    .toArray();

  const report = {
    dryRun: !apply,
    scanned: products.length,
    updatedProducts: 0,
    rowsUpdated: 0,
    unmatchedRows: [],
    multiSpanRows: [],
  };

  for (const product of products) {
    let changed = false;
    const cars = Array.isArray(product.compatibleCars) ? product.compatibleCars : [];
    const vcVehicles = Array.isArray(product.vehicleCompatibility?.vehicles)
      ? product.vehicleCompatibility.vehicles
      : [];

    const patchCars = cars.map((row) => {
      if (row?.generationId) return row;
      const make = String(row?.make || "").trim();
      const models = catalogByMake.get(make) || catalogByMake.get(make.toLowerCase()) || [];
      const resolved = resolveGenerationId(make, row?.model, row?.yearFrom, row?.yearTo, models);
      if (resolved.matches?.length > 1) {
        report.multiSpanRows.push({
          productId: String(product._id),
          slug: product.slug,
          source: "compatibleCars",
          make,
          model: row?.model,
          yearFrom: row?.yearFrom,
          yearTo: row?.yearTo,
          matches: resolved.matches,
        });
      }
      if (resolved.unmatched || !resolved.generationId) {
        report.unmatchedRows.push({
          productId: String(product._id),
          slug: product.slug,
          source: "compatibleCars",
          make,
          model: row?.model,
          yearFrom: row?.yearFrom,
          yearTo: row?.yearTo,
        });
        return row;
      }
      changed = true;
      report.rowsUpdated += 1;
      return {
        ...row,
        generationId: new mongoose.Types.ObjectId(resolved.generationId),
        generationLabel: resolved.generationLabel || row.generationLabel || "",
        generation: row.generation || resolved.generationLabel || "",
      };
    });

    const patchVc = vcVehicles.map((row) => {
      if (row?.generationId) return row;
      const make = String(row?.make || "").trim();
      const models = catalogByMake.get(make) || catalogByMake.get(make.toLowerCase()) || [];
      const resolved = resolveGenerationId(make, row?.model, row?.yearFrom, row?.yearTo, models);
      if (resolved.matches?.length > 1) {
        report.multiSpanRows.push({
          productId: String(product._id),
          slug: product.slug,
          source: "vehicleCompatibility.vehicles",
          make,
          model: row?.model,
          yearFrom: row?.yearFrom,
          yearTo: row?.yearTo,
          matches: resolved.matches,
        });
      }
      if (resolved.unmatched || !resolved.generationId) {
        report.unmatchedRows.push({
          productId: String(product._id),
          slug: product.slug,
          source: "vehicleCompatibility.vehicles",
          make,
          model: row?.model,
          yearFrom: row?.yearFrom,
          yearTo: row?.yearTo,
        });
        return row;
      }
      changed = true;
      report.rowsUpdated += 1;
      return {
        ...row,
        generationId: new mongoose.Types.ObjectId(resolved.generationId),
        generationLabel: resolved.generationLabel || row.generationLabel || "",
      };
    });

    if (!changed) continue;
    report.updatedProducts += 1;
    if (apply) {
      const $set = {};
      if (cars.length) $set.compatibleCars = patchCars;
      if (vcVehicles.length) {
        $set["vehicleCompatibility.vehicles"] = patchVc;
      }
      await db.collection("products").updateOne({ _id: product._id }, { $set });
    }
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        unmatchedSample: report.unmatchedRows.slice(0, 25),
        multiSpanSample: report.multiSpanRows.slice(0, 25),
        unmatchedCount: report.unmatchedRows.length,
        multiSpanCount: report.multiSpanRows.length,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
