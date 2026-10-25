#!/usr/bin/env node
/**
 * One-time fitment cleanup: move generation nicknames out of `model`.
 *
 *   node scripts/fix-fitment-models.mjs --dry-run
 *   node scripts/fix-fitment-models.mjs --apply
 *
 * Requires MONGODB_URI (store container env).
 */
import { MongoClient, ObjectId } from "mongodb";
import { resolveVehicleFitmentRow } from "../storecraft-store/lib/resolveVehicleFitment.js";

const dryRun = !process.argv.includes("--apply");

async function loadCatalogById(db) {
  const gens = await db
    .collection("cargenerations")
    .find({})
    .project({ name: 1, make: 1, model: 1, slug: 1 })
    .toArray()
    .catch(() => []);
  // Also try common collection names
  const alt = gens.length
    ? gens
    : await db
        .collection("vehicles")
        .find({ type: "generation" })
        .project({ name: 1, make: 1, model: 1, slug: 1 })
        .toArray()
        .catch(() => []);
  const map = new Map();
  for (const g of alt.length ? alt : gens) {
    map.set(String(g._id), g);
  }
  return map;
}

function patchRow(row, catalog) {
  const before = {
    make: row.make,
    model: row.model,
    generation: row.generationLabel || row.generation || "",
  };
  let catalogGen = null;
  if (row.generationId && catalog.has(String(row.generationId))) {
    catalogGen = catalog.get(String(row.generationId));
  }
  const after = resolveVehicleFitmentRow(row, catalogGen);
  const changed =
    before.model !== after.model ||
    before.generation !== after.generation ||
    Boolean(after.generation && !(row.generationLabel || row.generation));
  return { before, after, changed };
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const catalog = await loadCatalogById(db);

  const products = await db
    .collection("products")
    .find({
      $or: [
        { "compatibleCars.0": { $exists: true } },
        { "vehicleCompatibility.vehicles.0": { $exists: true } },
      ],
    })
    .project({
      slug: 1,
      name: 1,
      compatibleCars: 1,
      vehicleCompatibility: 1,
    })
    .toArray();

  console.log(`mode=${dryRun ? "dry-run" : "apply"} products=${products.length}`);
  console.log("slug,before.model,after.model,after.generation");

  let updates = 0;
  const titleMismatch = [];

  for (const p of products) {
    let productChanged = false;
    const cars = Array.isArray(p.compatibleCars) ? p.compatibleCars : [];
    const nextCars = cars.map((row) => {
      const { before, after, changed } = patchRow(row, catalog);
      if (changed) {
        productChanged = true;
        console.log(
          `${p.slug},${JSON.stringify(before.model)},${JSON.stringify(after.model)},${JSON.stringify(after.generation)}`
        );
        return {
          ...row,
          make: after.make,
          model: after.model,
          generation: after.generation,
          generationLabel: after.generation,
        };
      }
      return row;
    });

    const vcVehicles = Array.isArray(p.vehicleCompatibility?.vehicles)
      ? p.vehicleCompatibility.vehicles
      : [];
    const nextVc = vcVehicles.map((row) => {
      const { before, after, changed } = patchRow(row, catalog);
      if (changed) {
        productChanged = true;
        console.log(
          `${p.slug},${JSON.stringify(before.model)},${JSON.stringify(after.model)},${JSON.stringify(after.generation)}`
        );
        return {
          ...row,
          make: after.make,
          model: after.model,
          generation: after.generation,
          generationLabel: after.generation,
        };
      }
      return row;
    });

    // Report-only: title years vs fitment years
    const titleYears = String(p.name || "").match(/(20\d{2})\s*[-–—]\s*(20\d{2}|present)/i);
    if (titleYears && nextCars[0]?.yearFrom) {
      const tFrom = Number(titleYears[1]);
      const fFrom = Number(nextCars[0].yearFrom);
      if (Number.isFinite(tFrom) && Number.isFinite(fFrom) && tFrom !== fFrom) {
        titleMismatch.push({
          slug: p.slug,
          title: p.name,
          titleFrom: tFrom,
          fitmentFrom: fFrom,
          fitmentTo: nextCars[0].yearTo,
        });
      }
    }

    if (productChanged && !dryRun) {
      const $set = {};
      if (cars.length) $set.compatibleCars = nextCars;
      if (vcVehicles.length) {
        $set.vehicleCompatibility = {
          ...(p.vehicleCompatibility || {}),
          vehicles: nextVc,
        };
      }
      $set.updatedAt = new Date();
      await db.collection("products").updateOne({ _id: p._id }, { $set });
      updates += 1;
    } else if (productChanged) {
      updates += 1;
    }
  }

  console.error(`\n# rows/products that would change: ${updates}`);
  console.error("\n# TITLE vs FITMENT year mismatches (report only):");
  for (const m of titleMismatch) {
    console.error(
      `${m.slug}\ttitle=${m.titleFrom}\tfitment=${m.fitmentFrom}-${m.fitmentTo}\t${m.title}`
    );
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
