/**
 * Backfill generationId + generationLabel on product fitment rows; dedupe join rows.
 *
 * Intended row uniqueness: make + model + yearFrom + yearTo + generationId
 * (see comment on compatibleCarSchema in lib/models/Product.model.js).
 * Run this script before adding a compound unique index on compatibleCars.
 *
 * Usage:
 *   node scripts/backfill-fitment-generationId.mjs --dry-run
 *   node scripts/backfill-fitment-generationId.mjs
 */
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { buildCatalogFromMakes } from "../lib/carCatalogApi.js";
import { resolveGenerationId } from "../lib/fitmentGeneration.js";
import { buildVehicleCompatibilityPayload } from "../lib/vehicleCompatibility.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const dryRun = process.argv.includes("--dry-run");

const carModelSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    years: [Number],
    yearFrom: Number,
    yearTo: Number,
    isActive: Boolean,
    generation: String,
    nickname: String,
  },
  { _id: true }
);

const makeSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    isActive: Boolean,
    models: [carModelSchema],
  },
  { timestamps: true }
);

const compatibleCarSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    generation: String,
    generationId: mongoose.Schema.Types.ObjectId,
    generationLabel: String,
    yearFrom: Number,
    yearTo: Number,
  },
  { _id: true }
);

const vehicleFitmentRowSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    generationId: mongoose.Schema.Types.ObjectId,
    generationLabel: String,
    yearFrom: Number,
    yearTo: Number,
    bodyStyle: String,
    notes: String,
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    vehicleCompatibility: {
      fitmentType: String,
      universalNote: String,
      vehicles: [vehicleFitmentRowSchema],
      categories: [String],
    },
    compatibleCars: [compatibleCarSchema],
    isUniversal: Boolean,
  },
  { timestamps: true }
);

const CarCatalog =
  mongoose.models.CarCatalog || mongoose.model("CarCatalog", makeSchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

function rowKey(row) {
  return [
    String(row.make || "").trim().toLowerCase(),
    String(row.model || "").trim().toLowerCase(),
    row.yearFrom ?? "",
    row.yearTo ?? "",
    row.generationId != null ? String(row.generationId) : "",
  ].join("|");
}

function dedupeVehicleRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const key = rowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function catalogModelsForMake(carData, make) {
  return carData[make] || [];
}

function backfillRow(row, catalogModels) {
  const base = { ...row };
  if (base.generationId) {
    if (!base.generationLabel && base.generation) {
      base.generationLabel = String(base.generation).trim();
    }
    return base;
  }
  const resolved = resolveGenerationId(
    base.make,
    base.model,
    base.yearFrom,
    base.yearTo,
    catalogModels
  );
  if (resolved.generationId && !resolved.unmatched) {
    base.generationId = resolved.generationId;
    base.generationLabel = resolved.generationLabel || base.generationLabel || "";
  }
  if (base.generationLabel && !base.generation) {
    base.generation = base.generationLabel;
  }
  return base;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const makes = await CarCatalog.find({ isActive: { $ne: false } }).lean();
  const { carData } = buildCatalogFromMakes(makes);

  const cursor = Product.find({
    $or: [
      { "vehicleCompatibility.vehicles.0": { $exists: true } },
      { "compatibleCars.0": { $exists: true } },
    ],
  }).cursor();

  let scanned = 0;
  let updated = 0;
  let deduped = 0;
  let resolved = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const vc = doc.vehicleCompatibility || {};
    const vehicles = Array.isArray(vc.vehicles) ? vc.vehicles.map((v) => v.toObject?.() ?? { ...v }) : [];
    const cars = Array.isArray(doc.compatibleCars)
      ? doc.compatibleCars.map((c) => c.toObject?.() ?? { ...c })
      : [];

    if (!vehicles.length && !cars.length) continue;

    let changed = false;
    const nextVehicles = dedupeVehicleRows(
      vehicles.map((row) => {
        const models = catalogModelsForMake(carData, row.make);
        const next = backfillRow(row, models);
        if (!row.generationId && next.generationId) resolved += 1;
        return next;
      })
    );
    if (nextVehicles.length !== vehicles.length) {
      deduped += vehicles.length - nextVehicles.length;
      changed = true;
    }

    const payload = buildVehicleCompatibilityPayload({
      fitmentType: vc.fitmentType || "specific",
      universalNote: vc.universalNote,
      vehicles: nextVehicles,
      categories: vc.categories || [],
    });

    const nextCars = dedupeVehicleRows(payload.compatibleCars.map((c) => ({ ...c })));
    if (nextCars.length !== cars.length) {
      deduped += Math.max(0, cars.length - nextCars.length);
      changed = true;
    }

    const vehiclesJson = JSON.stringify(nextVehicles);
    const carsJson = JSON.stringify(cars);
    const nextCarsJson = JSON.stringify(nextCars);
    if (vehiclesJson !== JSON.stringify(vehicles) || nextCarsJson !== carsJson) {
      changed = true;
    }

    if (!changed) continue;
    updated += 1;

    if (dryRun) {
      console.log(
        `[dry-run] ${doc._id} vehicles ${vehicles.length}→${nextVehicles.length} compatibleCars ${cars.length}→${nextCars.length}`
      );
      continue;
    }

    doc.vehicleCompatibility = {
      ...vc,
      ...payload.vehicleCompatibility,
      vehicles: nextVehicles,
    };
    doc.compatibleCars = nextCars;
    doc.isUniversal = payload.isUniversal;
    doc.markModified("vehicleCompatibility");
    doc.markModified("compatibleCars");
    await doc.save();
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        updated,
        generationIdsResolved: resolved,
        duplicateRowsRemoved: deduped,
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
