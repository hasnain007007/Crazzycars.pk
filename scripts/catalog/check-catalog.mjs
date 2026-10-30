#!/usr/bin/env node
/**
 * Read-only catalog check: wrong/shared/missing images, title vs fitment, fitment model
 * holding a generation code, price problems, missing category. Never writes.
 *
 * From a database (read-only):
 *   MONGODB_URI=… node --import ./tests/alias-loader.mjs scripts/catalog/check-catalog.mjs
 * From JSON exports (admin GET /api/products + /api/car-catalog):
 *   node --import ./tests/alias-loader.mjs scripts/catalog/check-catalog.mjs \
 *     --products products.json --catalog car-catalog.json [--out issues.csv] [--fail-on high]
 *
 * --fail-on high|medium|low exits 1 when issues at that confidence or higher exist (CI use).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runCatalogChecks } from "./catalogChecks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

function readJsonList(file, keys) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(j)) return j;
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => o?.[p], j);
    if (Array.isArray(v)) return v;
  }
  throw new Error(`No list found in ${file}`);
}

export async function loadCatalogData() {
  const productsFile = arg("--products");
  if (productsFile) {
    return {
      products: readJsonList(productsFile, ["products", "data.products", "data"]),
      catalogMakes: readJsonList(arg("--catalog"), ["makes", "data.makes", "data"]),
    };
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Pass --products/--catalog JSON files or set MONGODB_URI.");
  const require = createRequire(path.join(ROOT, "storecraft-admin/package.json"));
  const mongoose = require("mongoose");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const products = await db
    .collection("products")
    .find({}, { projection: { name: 1, slug: 1, articleNo: 1, status: 1, pricing: 1, media: 1, categories: 1, vehicleCompatibility: 1, compatibleCars: 1, isUniversal: 1 } })
    .toArray();
  const catalogMakes = await db.collection("carcatalogs").find({}, { projection: { name: 1, models: 1 } }).toArray();
  await mongoose.disconnect();
  return { products, catalogMakes };
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const data = await loadCatalogData();
  const issues = runCatalogChecks(data);
  const counts = {};
  for (const i of issues) counts[i.type] = (counts[i.type] || 0) + 1;
  console.log(`Checked ${data.products.length} products — ${issues.length} issues`);
  for (const [t, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);

  const out = arg("--out");
  if (out) {
    const lines = ["sku,slug,type,confidence,detail,name"];
    for (const i of issues) lines.push([i.sku, i.slug, i.type, i.confidence, i.detail, i.name].map(csvCell).join(","));
    fs.writeFileSync(out, lines.join("\n") + "\n");
    console.log(`Wrote ${out}`);
  }

  const failOn = arg("--fail-on");
  if (failOn) {
    const rank = { high: 3, medium: 2, low: 1 };
    if (issues.some((i) => rank[i.confidence] >= rank[failOn])) process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(2);
  });
}
