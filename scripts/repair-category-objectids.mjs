#!/usr/bin/env node
/**
 * Repair mangled Category ObjectId refs in crazzycars_motorsports
 * (parentCategory / parents / ancestors stored as { buffer: {0..11} }).
 *
 * Dry-run:
 *   MONGODB_URI=mongodb://sialkot-mongo:27017/crazzycars_motorsports \
 *     node scripts/repair-category-objectids.mjs --site=crazzycars
 *
 * Apply:
 *   … node scripts/repair-category-objectids.mjs --site=crazzycars --apply
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  normalizeMongoObjectId,
} from "../storecraft-store/lib/normalizeMongoObjectId.js";

const EXPECTED_DB = "crazzycars_motorsports";
const site = process.argv.find((a) => a.startsWith("--site="))?.slice(7);
if (site !== "crazzycars") {
  console.error('Refusing: pass --site=crazzycars');
  process.exit(2);
}

const URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27019/crazzycars_motorsports";
const dbName = String(URI).split("/").pop()?.split("?")[0] || "";
if (dbName !== EXPECTED_DB) {
  console.error(`Refusing: URI DB must be ${EXPECTED_DB} (got ${dbName})`);
  process.exit(2);
}

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(ROOT, "backups");

const require = createRequire(pathToFileURL(path.join(ROOT, "storecraft-store", "package.json")));
const mongoose = require("mongoose");

function needsRepair(value) {
  if (value == null) return false;
  if (typeof value === "string") return false;
  if (typeof value?.toHexString === "function") return false;
  if (value?.buffer && typeof value.buffer === "object" && "0" in value.buffer) return true;
  if (typeof value === "object" && "0" in value && "11" in value && !value._id) return true;
  return false;
}

function anyCorrupt(cat) {
  if (needsRepair(cat.parentCategory)) return true;
  if (Array.isArray(cat.parents) && cat.parents.some(needsRepair)) return true;
  if (Array.isArray(cat.ancestors) && cat.ancestors.some(needsRepair)) return true;
  return false;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}  DB: ${EXPECTED_DB}`);
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
  const col = mongoose.connection.db.collection("categories");
  const docs = await col.find({}).toArray();
  const dirty = docs.filter(anyCorrupt);
  console.log(`Categories: ${docs.length}; corrupt parent refs: ${dirty.length}`);

  const backup = dirty.map((d) => ({
    _id: d._id,
    slug: d.slug,
    parentCategory: d.parentCategory,
    parents: d.parents,
    ancestors: d.ancestors,
  }));
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(BACKUP_DIR, `category-objectid-repair-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2) + "\n");
  console.log(`Backup: ${backupFile}`);

  let updated = 0;
  for (const d of dirty) {
    const parentCategory = normalizeMongoObjectId(d.parentCategory);
    const parents = (d.parents || []).map(normalizeMongoObjectId).filter(Boolean);
    const ancestors = (d.ancestors || []).map(normalizeMongoObjectId).filter(Boolean);
    const $set = {
      parentCategory: parentCategory
        ? new mongoose.Types.ObjectId(parentCategory)
        : null,
      parents: parents.map((id) => new mongoose.Types.ObjectId(id)),
      ancestors: ancestors.map((id) => new mongoose.Types.ObjectId(id)),
    };
    console.log(
      `${APPLY ? "[APPLY]" : "[DRY]"} ${d.slug} → parent=${parentCategory} parents=${parents.length} ancestors=${ancestors.length}`
    );
    if (APPLY) {
      await col.updateOne({ _id: d._id }, { $set });
      updated++;
    }
  }
  console.log(`Done. Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
