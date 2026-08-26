/**
 * REPLACE Car Catalog with real Homefy data (5 makes, 18 models incl. Honda Vezel).
 * Wipes all CarCatalog documents first.
 *
 * Actual schema: CarCatalog (Make) with embedded models[] — no separate Make/CarModel.
 *
 * Usage: node --env-file=.env.local scripts/vehicles/replaceCarCatalog.mjs
 */
import mongoose from "mongoose";
import { createRequire } from "module";
import CarCatalog from "../../lib/models/CarCatalog.model.js";

const require = createRequire(import.meta.url);
const { carCatalog } = require("../../../crazzycars-car-catalog/data/carCatalog.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CURRENT_YEAR = new Date().getFullYear();
const BODY_STYLES = ["Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover", "Coupe", "MPV"];

function yearsFromRange(yearFrom, yearTo) {
  const from = Number(yearFrom);
  const to = Number(yearTo == null ? CURRENT_YEAR : yearTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const years = [];
  for (let y = hi; y >= lo; y--) years.push(y);
  return years;
}

function mapBodyStyle(bodyType) {
  const raw = String(bodyType || "Sedan").trim();
  return BODY_STYLES.includes(raw) ? raw : "Sedan";
}

function mapModel(m, popularOrder) {
  const generation = String(m.generation || "").trim();
  return {
    name: String(m.name || "").trim(),
    slug: String(m.slug || "").trim(),
    generation,
    nickname: generation || String(m.name || "").trim(),
    yearFrom: m.yearFrom,
    yearTo: m.yearTo == null ? undefined : m.yearTo,
    years: yearsFromRange(m.yearFrom, m.yearTo),
    bodyStyle: mapBodyStyle(m.bodyType),
    image: m.image || "",
    description: "",
    popularAccessories: [],
    isPopular: Boolean(m.popular),
    popularOrder: m.popular ? popularOrder : 0,
    isActive: true,
    variants: [],
  };
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local");
    process.exit(1);
  }
  if (!Array.isArray(carCatalog) || !carCatalog.length) {
    console.error("carCatalog data missing");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected");
  console.log("Using model: CarCatalog (embedded models) — NOT Categories");

  const before = await CarCatalog.countDocuments();
  const del = await CarCatalog.deleteMany({});
  console.log(`Deleted ${del.deletedCount} makes (was ${before})`);

  let makeCount = 0;
  let modelCount = 0;
  let popularOrder = 0;

  for (const entry of carCatalog) {
    const mk = entry.make || {};
    const models = [];
    for (const m of entry.models || []) {
      if (m.popular) popularOrder += 1;
      models.push(mapModel(m, popularOrder));
      modelCount += 1;
      console.log(`   ${m.displayName || m.name} · ${m.bodyType}`);
    }

    await CarCatalog.create({
      name: mk.name,
      slug: mk.slug,
      country: mk.country || "Japan",
      logo: mk.logo || "",
      isActive: mk.isActive !== false,
      order: mk.sortOrder ?? makeCount + 1,
      models,
    });
    makeCount += 1;
    console.log(`Make: ${mk.name} (${mk.country}) — ${models.length} models\n`);
  }

  const makes = await CarCatalog.find({}).sort({ order: 1 }).lean();
  const totalModels = makes.reduce((n, m) => n + (m.models || []).length, 0);
  console.log(`Done. Makes: ${makes.length}, Models: ${totalModels}`);
  if (makes.length !== 5 || totalModels !== 18) {
    console.error(`Expected 5 makes / 18 models, got ${makes.length} / ${totalModels}`);
    process.exit(1);
  }
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
