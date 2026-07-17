import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import Category from "../lib/models/Category.model.js";
import Product from "../lib/models/Product.model.js";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureCategory(name) {
  const slug = slugify(name);
  const doc = await Category.findOneAndUpdate(
    { slug },
    {
      $set: {
        name,
        slug,
        status: "active",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  return doc;
}

const PRODUCTS = [
  {
    name: "316L Surgical Steel Nose Hoop Ring",
    category: "Nose Rings",
    articleNo: "BPJ-001",
    price: 1299,
    status: "active",
    featured: true,
    quantity: 50,
    description: "Premium 316L surgical steel nose hoop",
    tags: ["nose ring", "surgical steel", "hoop"],
  },
  {
    name: "Titanium Belly Button Ring - Jeweled",
    category: "Belly Rings",
    articleNo: "BPJ-002",
    price: 2499,
    status: "active",
    featured: true,
    quantity: 35,
    description: "ASTM F136 titanium belly button ring",
  },
  {
    name: "Gold Plated Septum Clicker Ring",
    category: "Septum Rings",
    articleNo: "BPJ-003",
    price: 1899,
    salePrice: 1499,
    status: "active",
    quantity: 25,
    newArrival: true,
  },
  {
    name: "Crystal Ear Stud Set - 6 Pairs",
    category: "Ear Piercings",
    articleNo: "BPJ-004",
    price: 3499,
    status: "active",
    featured: true,
    quantity: 40,
  },
  {
    name: "Industrial Barbell 14G Surgical Steel",
    category: "Ear Piercings",
    articleNo: "BPJ-005",
    price: 1699,
    status: "active",
    quantity: 20,
  },
  {
    name: "Daith Piercing Clicker Ring - Opal",
    category: "Ear Piercings",
    articleNo: "BPJ-006",
    price: 2899,
    salePrice: 2299,
    status: "active",
    quantity: 15,
    newArrival: true,
  },
  {
    name: "Tongue Ring Barbell 14G - UV Glow",
    category: "Tongue Rings",
    articleNo: "BPJ-007",
    price: 999,
    status: "active",
    quantity: 60,
  },
  {
    name: "Nipple Shield Ring - Rose Gold",
    category: "Body Jewelry",
    articleNo: "BPJ-008",
    price: 3299,
    status: "active",
    quantity: 10,
  },
  {
    name: "Eyebrow Curved Barbell 16G",
    category: "Eyebrow Rings",
    articleNo: "BPJ-009",
    price: 1199,
    status: "active",
    newArrival: true,
    quantity: 30,
  },
  {
    name: "316L Steel Labret Stud with Opal",
    category: "Lip Rings",
    articleNo: "BPJ-010",
    price: 1599,
    status: "active",
    quantity: 45,
  },
];

async function run() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env.local");

  await mongoose.connect(uri, { bufferCommands: false });

  let inserted = 0;
  let updated = 0;

  for (const item of PRODUCTS) {
    const category = await ensureCategory(item.category);
    const slug = slugify(item.name);
    const existing = await Product.findOne({ slug }).select("_id").lean();

    await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: item.name,
          slug,
          articleNo: item.articleNo,
          categories: [category._id],
          shortDescription: item.description || `Premium ${item.category.toLowerCase()} for safe and stylish piercings.`,
          longDescription: `<p>${item.name} is crafted with quality materials for comfort, durability, and everyday wear.</p>`,
          pricing: {
            regularPrice: item.price,
            salePrice: item.salePrice ?? undefined,
            saleSchedule: { enabled: false },
          },
          inventory: {
            quantity: item.quantity,
            weight: 2.5,
            weightUnit: "kg",
            trackInventory: true,
            lowStockThreshold: 3,
            sku: `SKU-${slug.toUpperCase().replace(/-/g, "").slice(0, 14)}`,
          },
          media: { images: [] },
          status: item.status,
          featured: Boolean(item.featured),
          newArrival: Boolean(item.newArrival),
          features: ["Hypoallergenic", "Premium finish", "Comfort fit"],
          tags: item.tags || [],
          seo: {
            metaTitle: item.name,
            metaDescription: `${item.name} for customers looking for premium body piercing jewelry.`,
            metaKeywords: ["body piercing jewelry", "surgical steel", "hypoallergenic"],
          },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    if (existing) updated += 1;
    else inserted += 1;
  }

  const totalActive = await Product.countDocuments({ status: "active" });
  console.log(`Seed complete. Inserted: ${inserted}, Updated: ${updated}, Active products total: ${totalActive}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
