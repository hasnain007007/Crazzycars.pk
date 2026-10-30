#!/usr/bin/env node
/**
 * One-off: prepaid-only products (body kits / codEligible:false) whose stored text still
 * mentions Cash on Delivery, COD or a booking advance. Each such sentence becomes
 * "Prepaid only — pay by JazzCash, Meezan or bank transfer. Delivery Rs 250 (Rs 500 with bulky items)."
 * (same rule as the storefront render guard, lib/prepaidText.js).
 *
 * Touches ONLY shortDescription, longDescription, seo.metaDescription and metaDescription —
 * never price, stock, slug or name. Dry run by default; prints the diff.
 *
 *   node --import ./tests/alias-loader.mjs scripts/fix-prepaid-text-2026-10.mjs --products full-products.json
 *   MONGODB_URI=… node --import ./tests/alias-loader.mjs scripts/fix-prepaid-text-2026-10.mjs [--apply --allow-write]
 * --apply refuses any database but the live fingerprint and writes a backup first.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { stripCodSentences } from "../storecraft-store/lib/prepaidText.js";
import { productAllowsCod } from "../storecraft-store/lib/codEligibility.js";
import { LIVE_URI_FINGERPRINT, assertLiveWriteFingerprint } from "./mongo/prodFingerprint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const APPLY = args.includes("--apply") && args.includes("--allow-write");
/** The only fields this script may write. */
export const TEXT_FIELDS = ["shortDescription", "longDescription", "seo.metaDescription", "metaDescription"];

const get = (o, k) => k.split(".").reduce((x, p) => x?.[p], o);

/** { set, changes } for one product; empty when not prepaid or nothing to change. */
export function planPrepaidText(product) {
  const set = {};
  const changes = [];
  if (productAllowsCod(product)) return { set, changes };
  for (const field of TEXT_FIELDS) {
    const before = get(product, field);
    if (typeof before !== "string" || !before) continue;
    const after = stripCodSentences(before);
    if (after !== before) {
      set[field] = after;
      changes.push({ field, before, after });
    }
  }
  return { set, changes };
}

async function load() {
  if (arg("--products")) {
    const j = JSON.parse(fs.readFileSync(arg("--products"), "utf8"));
    return { source: "json", products: Array.isArray(j) ? j : j.products || j.data };
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Pass --products <json> or set MONGODB_URI.");
  const fp = crypto.createHash("sha256").update(uri).digest("hex").slice(0, 16);
  if (APPLY) {
    const ok = assertLiveWriteFingerprint(fp);
    if (!ok.ok) throw new Error(`Refusing to write: ${ok.reason} (expected ${LIVE_URI_FINGERPRINT}).`);
  }
  const mongoose = createRequire(path.join(ROOT, "storecraft-admin/package.json"))("mongoose");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const cats = new Map((await db.collection("categories").find({}, { projection: { slug: 1 } }).toArray()).map((c) => [String(c._id), c]));
  const products = (await db.collection("products").find({}).toArray()).map((p) => ({
    ...p,
    categories: (p.categories || []).map((id) => cats.get(String(id)) || id),
  }));
  return { source: `db ${fp}`, products, db, mongoose };
}

async function main() {
  const data = await load();
  const plans = data.products
    .map((p) => ({ p, ...planPrepaidText(p) }))
    .filter((x) => x.changes.length);
  const lines = [
    `Prepaid text fix — ${data.source} — ${new Date().toISOString()}`,
    `${data.products.length} products scanned; ${plans.length} prepaid products have COD wording.`,
    `Fields that would change: ${[...new Set(plans.flatMap((x) => x.changes.map((c) => c.field)))].join(", ") || "none"}`,
    "",
  ];
  for (const { p, changes } of plans) {
    lines.push(`== ${p.articleNo || ""} ${p.slug} (${p.name})`);
    for (const c of changes) {
      lines.push(`-- ${c.field}`, `   BEFORE: ${c.before.replace(/\s+/g, " ").slice(0, 600)}`, `   AFTER:  ${c.after.replace(/\s+/g, " ").slice(0, 600)}`);
    }
    lines.push("");
  }
  const outDir = path.join(ROOT, "scripts/out");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, APPLY ? "prepaid-text-apply.txt" : "prepaid-text-dryrun.txt");
  fs.writeFileSync(outFile, lines.join("\n") + "\n");
  console.log(lines.slice(0, 3).join("\n"));
  console.log(`Wrote ${path.relative(ROOT, outFile)}`);

  if (!APPLY) {
    if (data.mongoose) await data.mongoose.disconnect();
    return;
  }
  if (!data.db) throw new Error("--apply needs MONGODB_URI.");
  // Safety: only the allowed text fields may be in any $set.
  for (const { set } of plans) {
    const bad = Object.keys(set).filter((k) => !TEXT_FIELDS.includes(k));
    if (bad.length) throw new Error(`Refusing: unexpected fields ${bad.join(", ")}`);
  }
  const backup = plans.map(({ p, set }) => ({ _id: String(p._id), slug: p.slug, before: Object.fromEntries(Object.keys(set).map((k) => [k, get(p, k)])) }));
  fs.writeFileSync(path.join(outDir, `prepaid-text-backup-${Date.now()}.json`), JSON.stringify(backup, null, 2));
  let n = 0;
  for (const { p, set } of plans) {
    const r = await data.db.collection("products").updateOne({ _id: p._id }, { $set: set });
    n += r.modifiedCount;
  }
  console.log(`Applied to ${n} products.`);
  await data.mongoose.disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(2);
  });
}
