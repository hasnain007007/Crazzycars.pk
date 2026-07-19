/**
 * Seed 234 CrazzyCars products into StoreCraft Product schema.
 * Requires categories + vehicles seeded first (links by slug → ObjectId).
 *
 * Field mapping (pack → StoreCraft):
 *   price / compareAtPrice → pricing.salePrice / pricing.regularPrice
 *   images[]               → media.images[] ({ url, altText, isMain })
 *   descriptionHtml        → longDescription
 *   variants[]             → simpleVariations + variationCombinations
 *   isFeatured             → featured + isFeatured
 *   isDeal                 → isDeal
 *   metaTitle/Description  → top-level + seo.*
 *   isActive/status        → status: active|inactive
 *   categorySlugs          → categories[] ObjectIds
 *   vehicleSlugs           → compatibleVehicles[] ObjectIds
 *
 * Usage: node --env-file=.env.local scripts/products/seedProducts.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Product from "../../lib/models/Product.model.js";
import Category from "../../lib/models/Category.model.js";
import Vehicle from "../../lib/models/Vehicle.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DATA =
  process.env.PRODUCTS_JSON ||
  path.resolve(__dirname, "../../../crazzycars-products/data/products.json");

function mapPricing(p) {
  const price = Number(p.price) || 0;
  const compare = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
  if (compare != null && compare > price && price > 0) {
    return { regularPrice: compare, salePrice: price };
  }
  return { regularPrice: price || compare || 0, salePrice: null };
}

function mapImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img, i) => {
      const url = typeof img === "string" ? img : img?.url || "";
      if (!url) return null;
      return {
        url,
        altText: (typeof img === "object" && img?.alt) || "",
        isMain: i === 0,
        publicId: "",
      };
    })
    .filter(Boolean);
}

function mapVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) {
    return { simpleVariations: [], variationCombinations: [] };
  }
  const axisMap = new Map();
  for (const v of variants) {
    const name = String(v.optionName || "Option").trim() || "Option";
    const value = String(v.optionValue || "").trim();
    if (!value) continue;
    if (!axisMap.has(name)) axisMap.set(name, new Set());
    axisMap.get(name).add(value);
  }
  const simpleVariations = [...axisMap.entries()].map(([name, tags]) => ({
    name,
    enabled: true,
    tags: [...tags],
  }));
  const variationCombinations = variants
    .filter((v) => String(v.optionValue || "").trim())
    .map((v) => ({
      options: [
        {
          name: String(v.optionName || "Option").trim() || "Option",
          value: String(v.optionValue || "").trim(),
        },
      ],
      price: Number(v.price) || 0,
      compareAtPrice: Number(v.compareAtPrice) || 0,
      stock: 50,
      sku: v.sku || "",
      image: v.image || "",
      priceDelta: 0,
      weightDelta: 0,
      weight: 0,
    }));
  return { simpleVariations, variationCombinations };
}

function mapStatus(p) {
  if (p.isActive === false) return "inactive";
  const s = String(p.status || "active").toLowerCase();
  if (s === "draft") return "draft";
  if (s === "unlisted" || s === "inactive") return "inactive";
  return "active";
}

function toStoreProduct(p, categoryIds, vehicleIds) {
  const pricing = mapPricing(p);
  const { simpleVariations, variationCombinations } = mapVariants(p.variants);
  const featured = Boolean(p.isFeatured);
  const isDeal = Boolean(p.isDeal);
  const isUniversal = Boolean(p.isUniversal);

  return {
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription || "",
    longDescription: p.descriptionHtml || "",
    pricing: {
      regularPrice: pricing.regularPrice,
      salePrice: pricing.salePrice,
      costPerItem: 0,
      saleSchedule: { enabled: false },
    },
    inventory: {
      quantity: 50,
      trackInventory: true,
      lowStockThreshold: 5,
      sku: "",
      weightUnit: "g",
    },
    media: {
      images: mapImages(p.images),
      videos: [],
      videoUrl: "",
      videoType: "",
    },
    simpleVariations,
    variationCombinations,
    variations: [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    vendor: p.vendor || "CrazzyCars.pk",
    categories: categoryIds,
    compatibleVehicles: vehicleIds,
    isUniversal,
    featured,
    isFeatured: featured,
    isDeal,
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    seo: {
      metaTitle: p.metaTitle || "",
      metaDescription: p.metaDescription || "",
      metaKeywords: [],
    },
    status: mapStatus(p),
    vehicleCompatibility: {
      fitmentType: isUniversal ? "universal" : vehicleIds.length ? "specific" : "universal",
      universalNote: "Fits all car makes and models",
      vehicles: [],
      categories: [],
    },
    condition: "new",
  };
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local");
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(DATA, "utf8"));
  if (!Array.isArray(products) || products.length === 0) {
    console.error("No products in", DATA);
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected — seeding products into StoreCraft schema");

  const catDocs = await Category.find({}, "slug _id").lean();
  const vehDocs = await Vehicle.find({}, "slug _id").lean();
  const catId = Object.fromEntries(catDocs.map((c) => [c.slug, c._id]));
  const vehId = Object.fromEntries(vehDocs.map((v) => [v.slug, v._id]));

  if (!catDocs.length) throw new Error("No categories — run seed:categories first");
  if (!vehDocs.length) throw new Error("No vehicles — run seed:vehicles first");

  console.log(`Categories loaded: ${catDocs.length}, Vehicles loaded: ${vehDocs.length}`);
  console.log(`Products to upsert: ${products.length}`);

  let ok = 0;
  const missing = [];
  for (const p of products) {
    const categoryIds = (p.categorySlugs || []).map((s) => catId[s]).filter(Boolean);
    const vehicleIds = (p.vehicleSlugs || []).map((s) => vehId[s]).filter(Boolean);
    if (categoryIds.length !== (p.categorySlugs || []).length) {
      missing.push(`category miss on ${p.slug}: ${(p.categorySlugs || []).filter((s) => !catId[s]).join(",")}`);
    }
    if (vehicleIds.length !== (p.vehicleSlugs || []).length) {
      missing.push(`vehicle miss on ${p.slug}: ${(p.vehicleSlugs || []).filter((s) => !vehId[s]).join(",")}`);
    }
    if (!categoryIds.length) {
      missing.push(`NO categories on ${p.slug}`);
    }

    const doc = toStoreProduct(p, categoryIds, vehicleIds);

    await Product.findOneAndUpdate(
      { slug: p.slug },
      { $set: doc },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    ok += 1;
    if (ok % 50 === 0) console.log(`  …${ok}/${products.length}`);
  }

  const total = await Product.countDocuments();
  const active = await Product.countDocuments({ status: "active" });
  const withCat = await Product.countDocuments({ "categories.0": { $exists: true } });
  const universal = await Product.countDocuments({ isUniversal: true });
  const featured = await Product.countDocuments({ $or: [{ featured: true }, { isFeatured: true }] });
  const deals = await Product.countDocuments({ isDeal: true });

  console.log(`\n${ok} products upserted`);
  console.log(`DB totals: ${total} products (${active} active, ${withCat} with ≥1 category)`);
  console.log(`Flags: universal=${universal}, featured=${featured}, deals=${deals}`);

  if (missing.length) {
    console.log(`\nUnresolved links (${missing.length}):`);
    missing.slice(0, 30).forEach((m) => console.log("  -", m));
    if (missing.length > 30) console.log(`  …and ${missing.length - 30} more`);
  }

  if (ok !== 234) {
    console.warn(`Expected 234 products, upserted ${ok}`);
  }
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
