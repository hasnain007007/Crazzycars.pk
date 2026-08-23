#!/usr/bin/env node
/**
 * Export every product with EMPTY spec columns for humans to fill.
 * Never guesses from title or description.
 *
 *   MONGODB_URI='mongodb://127.0.0.1:27018/sialkot_motorsports?directConnection=true' \
 *     node --experimental-strip-types scripts/spec-backfill-template.ts
 *
 * Re-import the filled file via Admin → Products CSV bar (spec-only CSV is
 * detected automatically) or:
 *   node --experimental-strip-types scripts/spec-backfill-template.ts --import data/crazzycars-spec-backfill-template.csv
 *
 * Import only writes non-empty cells.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  SPEC_BACKFILL_HEADERS,
  specPatchFromCsvRow,
} from "../lib/product-specs.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_CSV = path.join(ROOT, "data/crazzycars-spec-backfill-template.csv");

const IMPORT_FLAG = process.argv.includes("--import");
const importIdx = process.argv.indexOf("--import");
const IMPORT_PATH =
  IMPORT_FLAG && process.argv[importIdx + 1] && !process.argv[importIdx + 1].startsWith("--")
    ? path.resolve(process.argv[importIdx + 1])
    : OUT_CSV;

function csvEscape(value: string): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, "storecraft-store/.env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] != null) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => String(c || "").trim()))
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = r[i] != null ? String(r[i]).trim() : "";
      });
      return obj;
    });
}

async function withMongo<T>(fn: (Product: { find: Function; updateOne: Function }) => Promise<T>): Promise<T> {
  loadEnvLocal();
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Set MONGODB_URI");
  }
  const storeRoot = path.join(ROOT, "storecraft-store");
  const mongoose = require(path.join(storeRoot, "node_modules/mongoose"));
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 12000 });
  try {
    const Product = mongoose.connection.db.collection("products");
    return await fn(Product);
  } finally {
    await mongoose.disconnect();
  }
}

async function exportTemplate() {
  const products = await withMongo((products) =>
    products
      .find({}, { projection: { slug: 1, name: 1, articleNo: 1 } })
      .sort({ slug: 1 })
      .toArray()
  );
  const lines = [
    SPEC_BACKFILL_HEADERS.join(","),
    ...products.map((p: { slug?: string; name?: string; articleNo?: string }) =>
      SPEC_BACKFILL_HEADERS.map((h) => {
        if (h === "slug") return csvEscape(p.slug || "");
        if (h === "name") return csvEscape(p.name || "");
        if (h === "articleNo") return csvEscape(p.articleNo || "");
        return "";
      }).join(",")
    ),
  ];
  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  fs.writeFileSync(OUT_CSV, `${lines.join("\n")}\n`, "utf8");
  console.log(`[spec-backfill] Wrote ${products.length} rows (empty spec columns) → ${OUT_CSV}`);
}

async function importFilled() {
  if (!fs.existsSync(IMPORT_PATH)) {
    throw new Error(`CSV not found: ${IMPORT_PATH}`);
  }
  const rows = parseCsv(fs.readFileSync(IMPORT_PATH, "utf8"));
  let updated = 0;
  let skipped = 0;
  await withMongo(async (products) => {
    for (const row of rows) {
      const slug = String(row.slug || "").trim();
      if (!slug) {
        skipped += 1;
        continue;
      }
      const patch = specPatchFromCsvRow(row);
      if (!Object.keys(patch).length) {
        skipped += 1;
        continue;
      }
      const res = await products.updateOne({ slug }, { $set: patch });
      if (res.matchedCount) updated += 1;
      else skipped += 1;
    }
  });
  console.log(`[spec-backfill] Import done. updated=${updated} skipped=${skipped} from ${IMPORT_PATH}`);
}

async function main() {
  if (IMPORT_FLAG) await importFilled();
  else await exportTemplate();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
