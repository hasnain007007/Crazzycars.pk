#!/usr/bin/env node
/**
 * Apply isBulky=true for dry-run list minus exclusions.
 * Usage: node apply-bulky-seed.mjs --exclude CC-0157
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  fs.existsSync("/app/package.json") ? "/app/package.json" : process.cwd() + "/package.json"
);
const { MongoClient } = require("mongodb");

const BULKY_CATEGORY_SLUGS = new Set([
  "splitters-side-skirts",
  "spoilers-diffusers",
  "side-skirts",
  "floor-mats",
  "body-kits-extensions",
  "body-kits",
  "car-splitters-side-skirts",
  "car-spoilers-diffusers",
]);

const KEYWORD_RES = [
  { id: "splitter", re: /\bsplitters?\b/i },
  { id: "side_skirt", re: /\bside[\s_-]?skirts?\b/i },
  { id: "spoiler", re: /\bspoilers?\b/i },
  { id: "diffuser", re: /\bdiffusers?\b/i },
  { id: "floor_mat", re: /\bfloor[\s_-]?mats?\b/i },
  { id: "body_kit", re: /\bbody[\s_-]?kits?\b/i },
  { id: "lip_kit", re: /\blip[\s_-]?kits?\b/i },
];

const FALSE_POSITIVE_RES = [
  /\bled[\s_-]?strip/i,
  /\bunder[\s_-]?body\b/i,
  /\bkey[\s_-]?chain\b/i,
  /\bsticker\b/i,
  /\bdecal\b/i,
];

function parseExcludes() {
  const out = new Set();
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--exclude" && argv[i + 1]) {
      for (const sku of String(argv[++i]).split(",")) {
        const s = sku.trim().toUpperCase();
        if (s) out.add(s);
      }
    }
  }
  return out;
}

function textBlob(p) {
  return [p.name, p.slug, p.articleNo].filter(Boolean).join(" ");
}

function keywordHits(text) {
  const hits = [];
  for (const { id, re } of KEYWORD_RES) {
    if (re.test(text)) hits.push(id);
  }
  return hits;
}

async function main() {
  const excludes = parseExcludes();
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const categories = await db
    .collection("categories")
    .find({}, { projection: { slug: 1 } })
    .toArray();
  const bulkyCatIds = new Set();
  for (const c of categories) {
    if (BULKY_CATEGORY_SLUGS.has(String(c.slug || "").toLowerCase())) {
      bulkyCatIds.add(String(c._id));
    }
  }

  const products = await db
    .collection("products")
    .find({}, { projection: { articleNo: 1, slug: 1, name: 1, categories: 1, isBulky: 1 } })
    .toArray();

  const toFlag = [];
  for (const p of products) {
    const sku = String(p.articleNo || "").toUpperCase();
    if (excludes.has(sku)) continue;
    const text = textBlob(p);
    if (FALSE_POSITIVE_RES.some((re) => re.test(text))) continue;
    const catHit = (p.categories || []).some((id) => bulkyCatIds.has(String(id)));
    const kw = keywordHits(text);
    if (!catHit && kw.length === 0) continue;
    toFlag.push(p._id);
  }

  // Clear any prior isBulky then set approved set (safe: none existed)
  await db.collection("products").updateMany({ isBulky: true }, { $set: { isBulky: false } });
  const res = await db.collection("products").updateMany(
    { _id: { $in: toFlag } },
    { $set: { isBulky: true, updatedAt: new Date() } }
  );

  const sample = await db
    .collection("products")
    .find({ isBulky: true }, { projection: { articleNo: 1, name: 1 } })
    .sort({ articleNo: 1 })
    .toArray();

  const excludedStill = await db
    .collection("products")
    .find(
      { articleNo: { $in: [...excludes] } },
      { projection: { articleNo: 1, isBulky: 1, name: 1 } }
    )
    .toArray();

  console.log(
    JSON.stringify(
      {
        ok: true,
        excludes: [...excludes],
        matchedIds: toFlag.length,
        modified: res.modifiedCount,
        matched: res.matchedCount,
        bulkyTrueNow: sample.length,
        excludedDocs: excludedStill,
        first5: sample.slice(0, 5).map((p) => p.articleNo),
        last5: sample.slice(-5).map((p) => p.articleNo),
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    "/tmp/bulky-seed-applied.json",
    JSON.stringify(
      {
        appliedAt: new Date().toISOString(),
        excludes: [...excludes],
        count: sample.length,
        articleNos: sample.map((p) => p.articleNo),
      },
      null,
      2
    )
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
