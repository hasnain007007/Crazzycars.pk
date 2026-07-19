/**
 * Seed CrazzyCars category tree into MongoDB (StoreCraft schema).
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local scripts/categories/seedCategories.mjs
 *
 * Upserts by slug — safe to re-run.
 */
import mongoose from "mongoose";
import { parents, children } from "./seedData.mjs";
import Category from "../../lib/models/Category.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

function toDocFields(row, { level, parentCategory, parents, ancestors }) {
  const featured = Boolean(row.isFeatured);
  return {
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    image: { url: row.imageUrl || "", publicId: "" },
    icon: row.icon || "",
    seo: {
      metaTitle: row.metaTitle || "",
      metaDescription: row.metaDescription || "",
      metaKeywords: [],
    },
    shopifyHandle: row.shopifyHandle || "",
    shopifyId: row.shopifyId || "",
    sortOrder: row.sortOrder ?? 0,
    homepageOrder: featured ? row.sortOrder ?? 0 : 0,
    status: "active",
    isFeatured: featured,
    featured,
    showOnHomepage: featured,
    showInNav: true,
    showInFooter: level === 0,
    isTopCategory: level === 0,
    level,
    parentCategory: parentCategory || null,
    parents: parents || [],
    ancestors: ancestors || [],
  };
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const parentIdBySlug = {};
  for (const p of parents) {
    const fields = toDocFields(p, { level: 0, parentCategory: null, parents: [], ancestors: [] });
    const doc = await Category.findOneAndUpdate(
      { slug: p.slug },
      { $set: fields },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    parentIdBySlug[p.slug] = doc._id;
    console.log(`  Parent: ${doc.name}`);
  }

  for (const c of children) {
    const parentIds = (c.parentSlugs || []).map((slug) => {
      const id = parentIdBySlug[slug];
      if (!id) throw new Error(`Unknown parent slug "${slug}" for child "${c.name}"`);
      return id;
    });
    const primary = parentIds[0] || null;
    const fields = toDocFields(c, {
      level: 1,
      parentCategory: primary,
      parents: parentIds,
      ancestors: parentIds,
    });
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $set: fields },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    console.log(`     Child: ${doc.name}  (under: ${(c.parentSlugs || []).join(", ")})`);
  }

  const total = await Category.countDocuments({ status: "active" });
  const roots = await Category.countDocuments({
    status: "active",
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
    parents: { $size: 0 },
  });
  console.log(`\nDone. ${parents.length} parents + ${children.length} children (active in DB: ${total}, roots≈${roots})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
