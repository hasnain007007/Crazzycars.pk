/**
 * Seed body piercing jewelry products for catalog testing.
 * Usage (from repo root): node scripts/seed-products.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../lib/models/Product.model.js";
import Category from "../lib/models/Category.model.js";
import { slugify } from "../lib/slugify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const SEED_PRODUCTS = [
  {
    name: "316L Surgical Steel Nose Hoop Ring",
    articleNo: "BPJ-001",
    quantity: 50,
    lowStockThreshold: 5,
    regularPrice: 1299,
    categoryName: "Nose Rings",
    shortDescription: "Premium 316L surgical steel nose hoop",
    tags: ["nose ring", "surgical steel", "hoop"],
    status: "active",
    featured: true,
  },
  {
    name: "Titanium Belly Button Ring - Jeweled",
    articleNo: "BPJ-002",
    quantity: 35,
    lowStockThreshold: 10,
    regularPrice: 2499,
    categoryName: "Belly Rings",
    shortDescription: "ASTM F136 titanium belly button ring",
    status: "active",
    featured: true,
  },
  {
    name: "Gold Plated Septum Clicker Ring",
    articleNo: "BPJ-003",
    quantity: 25,
    lowStockThreshold: 5,
    regularPrice: 1899,
    salePrice: 1499,
    categoryName: "Septum Rings",
    status: "active",
    newArrival: true,
  },
  {
    name: "Crystal Ear Stud Set - 6 Pairs",
    articleNo: "BPJ-004",
    quantity: 40,
    lowStockThreshold: 5,
    regularPrice: 3499,
    categoryName: "Ear Piercings",
    status: "active",
    featured: true,
  },
  {
    name: "Industrial Barbell 14G Surgical Steel",
    articleNo: "BPJ-005",
    quantity: 20,
    lowStockThreshold: 5,
    regularPrice: 1699,
    categoryName: "Ear Piercings",
    status: "active",
  },
  {
    name: "Daith Piercing Clicker Ring - Opal",
    articleNo: "BPJ-006",
    quantity: 15,
    lowStockThreshold: 5,
    regularPrice: 2899,
    salePrice: 2299,
    categoryName: "Ear Piercings",
    status: "active",
    newArrival: true,
  },
  {
    name: "Tongue Ring Barbell 14G - UV Glow",
    articleNo: "BPJ-007",
    quantity: 60,
    lowStockThreshold: 8,
    regularPrice: 999,
    categoryName: "Tongue Rings",
    status: "active",
  },
  {
    name: "Nipple Shield Ring - Rose Gold",
    articleNo: "BPJ-008",
    quantity: 10,
    lowStockThreshold: 3,
    regularPrice: 3299,
    categoryName: "Body Jewelry",
    status: "active",
  },
  {
    name: "Eyebrow Curved Barbell 16G",
    articleNo: "BPJ-009",
    quantity: 30,
    lowStockThreshold: 5,
    regularPrice: 1199,
    categoryName: "Eyebrow Rings",
    status: "active",
    newArrival: true,
  },
  {
    name: "316L Steel Labret Stud with Opal",
    articleNo: "BPJ-010",
    quantity: 45,
    lowStockThreshold: 8,
    regularPrice: 1599,
    categoryName: "Lip Rings",
    status: "active",
  },
];

async function ensureCategory(name) {
  const slug = slugify(name) || "category";
  let doc = await Category.findOne({
    $or: [{ name }, { slug }],
  }).lean();
  if (doc) {
    return doc._id;
  }
  const created = await Category.create({
    name,
    slug,
    status: "active",
    isTopCategory: true,
  });
  console.log(`Created category: ${name} (${created.slug})`);
  return created._id;
}

async function uniqueProductSlug(base) {
  const root = slugify(base) || "product";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const exists = await Product.findOne({ slug }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 2}`;
  }
  throw new Error("Could not allocate unique product slug.");
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const categoryIdsByName = {};
  const uniqueCategoryNames = [...new Set(SEED_PRODUCTS.map((p) => p.categoryName))];
  for (const name of uniqueCategoryNames) {
    categoryIdsByName[name] = await ensureCategory(name);
  }

  for (const row of SEED_PRODUCTS) {
    const existing = await Product.findOne({ articleNo: row.articleNo }).select("_id name").lean();
    if (existing) {
      console.log(`Skip (already exists): ${row.articleNo} — ${existing.name}`);
      continue;
    }

    const slug = await uniqueProductSlug(row.name);
    const categoryId = categoryIdsByName[row.categoryName];

    const doc = await Product.create({
      name: row.name,
      slug,
      articleNo: row.articleNo,
      categories: [categoryId],
      pricing: {
        regularPrice: row.regularPrice,
        ...(row.salePrice ? { salePrice: row.salePrice } : {}),
      },
      inventory: {
        quantity: row.quantity,
        lowStockThreshold: row.lowStockThreshold,
        trackInventory: true,
      },
      status: row.status || "active",
      featured: Boolean(row.featured),
      newArrival: Boolean(row.newArrival),
      shortDescription: row.shortDescription || `Seed piercing jewelry product (${row.articleNo}).`,
      tags: row.tags || [],
    });

    console.log(
      `Created product: ${doc.name} | articleNo=${doc.articleNo} | qty=${doc.inventory.quantity} | threshold=${doc.inventory.lowStockThreshold} | id=${doc._id}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
