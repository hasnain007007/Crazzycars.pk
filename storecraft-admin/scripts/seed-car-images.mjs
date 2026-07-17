/**
 * Enrich existing CarCatalog documents with bodyStyle, popularAccessories, country, etc.
 * Does not overwrite custom images or descriptions already set.
 *
 * Usage: node scripts/seed-car-images.mjs
 */
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { MODEL_CATALOG_META } from "../lib/carCatalogSeedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MAKE_COUNTRIES = {
  Honda: "Japan",
  Toyota: "Japan",
  Suzuki: "Japan",
  KIA: "South Korea",
  Hyundai: "South Korea",
  MG: "China",
  Changan: "China",
  Haval: "China",
};

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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const makes = await CarCatalog.find({});
  let updatedMakes = 0;
  let updatedModels = 0;

  for (const make of makes) {
    let dirty = false;
    if (!make.country) {
      make.country = MAKE_COUNTRIES[make.name] || "Japan";
      dirty = true;
    }
    for (const model of make.models || []) {
      const key = `${make.name}|${model.name}`;
      const meta = MODEL_CATALOG_META[key];
      if (!meta) continue;
      if (!model.bodyStyle) {
        model.bodyStyle = meta.bodyStyle;
        dirty = true;
        updatedModels += 1;
      }
      if (!model.popularAccessories?.length && meta.popularAccessories?.length) {
        model.popularAccessories = meta.popularAccessories;
        dirty = true;
      }
      if (model.yearFrom == null && Array.isArray(model.years) && model.years.length) {
        const sorted = [...model.years].sort((a, b) => a - b);
        model.yearFrom = sorted[0];
        model.yearTo = sorted[sorted.length - 1];
        dirty = true;
      }
    }
    if (dirty) {
      make.markModified("models");
      await make.save();
      updatedMakes += 1;
      console.log(`Updated ${make.name}`);
    }
  }

  console.log(`Done. ${updatedMakes} make(s), ${updatedModels} model field(s) enriched.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
