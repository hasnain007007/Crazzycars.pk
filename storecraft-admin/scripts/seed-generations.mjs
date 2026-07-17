/**
 * Add generation/nickname model entries to existing CarCatalog (Pakistani market).
 * Does not remove existing models — only adds missing slugs.
 *
 * Usage: node scripts/seed-generations.mjs
 */
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { slugify, yearsFromRange } from "../lib/carCatalogUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const GENERATION_ENTRIES = [
  { make: "Honda", model: "Civic", generation: "10th Gen", nickname: "Civic X", yearFrom: 2016, yearTo: 2021 },
  { make: "Honda", model: "Civic", generation: "9th Gen", nickname: "Civic FC", yearFrom: 2012, yearTo: 2015 },
  { make: "Honda", model: "Civic", generation: "8th Gen", nickname: "Civic Reborn", yearFrom: 2006, yearTo: 2012 },
  { make: "Honda", model: "Civic", generation: "7th Gen", nickname: "Civic Rebirth", yearFrom: 2001, yearTo: 2005 },
  { make: "Honda", model: "Civic", generation: "6th Gen", nickname: "Civic EX", yearFrom: 1996, yearTo: 2000 },
  { make: "Honda", model: "City", generation: "7th Gen", nickname: "City 2021+", yearFrom: 2021, yearTo: 2025 },
  { make: "Honda", model: "City", generation: "4th Gen", nickname: "City Classic", yearFrom: 2009, yearTo: 2021 },
  { make: "Honda", model: "City", generation: "3rd Gen", nickname: "City 2003-2008", yearFrom: 2003, yearTo: 2008 },
  { make: "Toyota", model: "Corolla Altis", generation: "11th Gen", nickname: "Altis", yearFrom: 2014, yearTo: 2021 },
  { make: "Toyota", model: "Corolla Grande", generation: "11th Gen", nickname: "Grande", yearFrom: 2014, yearTo: 2021 },
  { make: "Toyota", model: "Corolla XLI/GLI", generation: "10th Gen", nickname: "XLI/GLI", yearFrom: 2008, yearTo: 2014 },
  { make: "Toyota", model: "Corolla Classic", generation: "9th Gen", nickname: "Classic", yearFrom: 2002, yearTo: 2007 },
  { make: "Suzuki", model: "Alto VXR/VXL", generation: "New Shape", nickname: "Alto 660cc", yearFrom: 2019, yearTo: 2025, bodyStyle: "Hatchback" },
  { make: "Suzuki", model: "Cultus", generation: "New Shape", nickname: "New Cultus", yearFrom: 2017, yearTo: 2025, bodyStyle: "Hatchback" },
  { make: "Suzuki", model: "Wagon R", generation: "New Shape", nickname: "Wagon R 2014+", yearFrom: 2014, yearTo: 2025, bodyStyle: "Hatchback" },
];

const carModelSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    years: [Number],
    yearFrom: Number,
    yearTo: Number,
    isActive: Boolean,
    bodyStyle: String,
    image: String,
    description: String,
    popularAccessories: [String],
    generation: String,
    nickname: String,
  },
  { _id: true }
);

const makeSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    order: Number,
    isActive: Boolean,
    logo: String,
    country: String,
    models: [carModelSchema],
  },
  { timestamps: true }
);

const CarCatalog = mongoose.models.CarCatalog || mongoose.model("CarCatalog", makeSchema);

function buildModelRow(row) {
  const slug =
    slugify(row.nickname || `${row.model}-${row.generation}`) ||
    slugify(`${row.model}-${row.yearFrom}-${row.yearTo}`);
  return {
    name: row.model,
    slug,
    years: yearsFromRange(row.yearFrom, row.yearTo),
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    isActive: true,
    bodyStyle: row.bodyStyle || "Sedan",
    image: "",
    description: "",
    popularAccessories: [],
    generation: row.generation || "",
    nickname: row.nickname || "",
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  let added = 0;
  let updated = 0;

  for (const row of GENERATION_ENTRIES) {
    const doc = await CarCatalog.findOne({ name: row.make });
    if (!doc) {
      console.warn(`Make not found: ${row.make} — skip ${row.nickname || row.model}`);
      continue;
    }

    const newRow = buildModelRow(row);
    const existingIdx = doc.models.findIndex((m) => m.slug === newRow.slug);

    if (existingIdx >= 0) {
      const existing = doc.models[existingIdx];
      let changed = false;
      if (!existing.generation && newRow.generation) {
        existing.generation = newRow.generation;
        changed = true;
      }
      if (!existing.nickname && newRow.nickname) {
        existing.nickname = newRow.nickname;
        changed = true;
      }
      if (!existing.yearFrom && newRow.yearFrom) {
        existing.yearFrom = newRow.yearFrom;
        existing.yearTo = newRow.yearTo;
        existing.years = newRow.years;
        changed = true;
      }
      if (changed) {
        doc.models[existingIdx] = existing;
        await doc.save();
        updated++;
        console.log(`Updated: ${row.make} ${newRow.nickname || newRow.name}`);
      } else {
        console.log(`Exists: ${row.make} ${newRow.slug}`);
      }
      continue;
    }

    doc.models.push(newRow);
    await doc.save();
    added++;
    console.log(`Added: ${row.make} ${newRow.nickname || newRow.name} (${newRow.slug})`);
  }

  console.log(`\nDone. Added ${added}, updated ${updated}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
