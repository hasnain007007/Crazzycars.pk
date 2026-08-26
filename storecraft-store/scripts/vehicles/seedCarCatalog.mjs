/**
 * Sync Homefy vehicle generations into admin Car Catalog (Makes → Models).
 * Does NOT touch product Categories.
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local scripts/vehicles/seedCarCatalog.mjs
 *
 * Upserts by make slug + model slug — keeps other catalog models intact.
 */
import mongoose from "mongoose";
import { createRequire } from "module";
import CarCatalog from "../../lib/models/CarCatalog.model.js";

const require = createRequire(import.meta.url);
const { vehicles } = require("./vehiclesData.cjs");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CURRENT_YEAR = new Date().getFullYear();

const MAKE_META = {
  Toyota: { country: "Japan", order: 1 },
  Honda: { country: "Japan", order: 2 },
  Hyundai: { country: "South Korea", order: 3 },
  Suzuki: { country: "Japan", order: 4 },
  Haval: { country: "China", order: 5 },
  KIA: { country: "South Korea", order: 6 },
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

function guessBodyStyle(make, model) {
  const key = `${make}|${model}`.toLowerCase();
  if (/h6|sportage|prado|fortuner|brv/.test(key)) return "SUV";
  if (/alto|swift|vitz|aqua|yaris|mehran|cultus|wagon/.test(key)) return "Hatchback";
  return "Sedan";
}

function vehicleToModel(v, popularOrder) {
  const yearTo = v.yearTo == null ? CURRENT_YEAR : v.yearTo;
  const years = yearsFromRange(v.yearFrom, yearTo);
  const nickname = String(v.generation || "").trim() || String(v.model || "").trim();
  return {
    name: String(v.model || "").trim(),
    slug: String(v.slug || "").trim() || slugify(`${v.make}-${v.model}-${v.generation}`),
    years,
    yearFrom: v.yearFrom,
    yearTo: v.yearTo == null ? null : yearTo,
    isActive: true,
    bodyStyle: guessBodyStyle(v.make, v.model),
    image: v.image || "",
    description: v.metaDescription || "",
    popularAccessories: [],
    generation: String(v.generation || "").trim(),
    nickname,
    isPopular: true,
    popularOrder,
    variants: [],
  };
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }
  if (!Array.isArray(vehicles) || !vehicles.length) {
    console.error("No vehicles in data file.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected — syncing vehicles → Car Catalog (not Categories)");

  const byMake = new Map();
  for (const v of vehicles) {
    const make = String(v.make || "").trim();
    if (!make) continue;
    if (!byMake.has(make)) byMake.set(make, []);
    byMake.get(make).push(v);
  }

  let makeCount = 0;
  let modelCount = 0;
  let popularOrder = 0;

  for (const [makeName, list] of [...byMake.entries()].sort((a, b) => {
    const oa = MAKE_META[a[0]]?.order ?? 99;
    const ob = MAKE_META[b[0]]?.order ?? 99;
    return oa - ob || a[0].localeCompare(b[0]);
  })) {
    const makeSlug = slugify(makeName);
    const meta = MAKE_META[makeName] || { country: "Various", order: 50 + makeCount };
    let doc = await CarCatalog.findOne({ slug: makeSlug });
    if (!doc) {
      doc = new CarCatalog({
        name: makeName,
        slug: makeSlug,
        order: meta.order,
        isActive: true,
        country: meta.country,
        logo: "",
        models: [],
      });
      makeCount += 1;
      console.log(`  + Make: ${makeName}`);
    } else {
      doc.name = makeName;
      doc.isActive = true;
      if (!doc.country) doc.country = meta.country;
      if (doc.order == null) doc.order = meta.order;
      console.log(`  ~ Make: ${makeName}`);
    }

    const models = Array.isArray(doc.models) ? [...doc.models] : [];
    for (const v of list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))) {
      popularOrder += 1;
      const incoming = vehicleToModel(v, popularOrder);
      const idx = models.findIndex((m) => String(m.slug) === String(incoming.slug));
      if (idx >= 0) {
        const prev = models[idx].toObject ? models[idx].toObject() : { ...models[idx] };
        models[idx] = {
          ...prev,
          ...incoming,
          _id: prev._id,
          popularAccessories: prev.popularAccessories?.length
            ? prev.popularAccessories
            : incoming.popularAccessories,
          variants: prev.variants?.length ? prev.variants : [],
        };
        console.log(`     ~ Model: ${incoming.nickname || incoming.name} (${incoming.slug})`);
      } else {
        models.push(incoming);
        console.log(`     + Model: ${incoming.nickname || incoming.name} (${incoming.slug})`);
      }
      modelCount += 1;
    }

    doc.models = models;
    await doc.save();
  }

  const makes = await CarCatalog.countDocuments({ isActive: true });
  const all = await CarCatalog.find({ isActive: true }).select("name models").lean();
  const totalModels = all.reduce((n, m) => n + (m.models || []).filter((x) => x.isActive !== false).length, 0);
  console.log(`\nDone. Makes active: ${makes}. Models synced this run: ${modelCount}. Models in catalog: ${totalModels}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Car Catalog seed failed:", err);
  process.exit(1);
});
