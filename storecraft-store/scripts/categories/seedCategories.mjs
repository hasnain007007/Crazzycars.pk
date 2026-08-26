/**
 * Seed Homefy category tree (StoreCraft schema).
 * Source: crazzycars-categories/data/categories.js
 *
 * Usage: node --env-file=.env.local scripts/categories/seedCategories.mjs
 */
import mongoose from "mongoose";
import { createRequire } from "module";
import Category from "../../lib/models/Category.model.js";

const require = createRequire(import.meta.url);
const { mapPackRow } = require("../../../crazzycars-categories/seed/mapToStoreCraft.js");
const { parents, children } = require("../../../crazzycars-categories/data/categories.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected — seeding categories with full SEO");

  const parentIdBySlug = {};
  for (const p of parents) {
    const fields = mapPackRow(p, { level: 0, parentCategory: null, parents: [], ancestors: [] });
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
    const fields = mapPackRow(c, {
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
  console.log(`\nDone. ${parents.length} parents + ${children.length} children (active in DB: ${total})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
