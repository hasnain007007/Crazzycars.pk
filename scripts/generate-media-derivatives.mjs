#!/usr/bin/env node
/**
 * Generate missing local /media derivatives into the persistent volume.
 * Prefer: -sm.webp (max edge 1200, webp q=78) and -400.webp (max edge 400, q=75).
 * NEVER overwrite an existing file. Copy-only / write-new only.
 *
 * Usage (on VPS, MEDIA_ROOT=/data/crazzycars/media):
 *   MEDIA_ROOT=/data/crazzycars/media node scripts/generate-media-derivatives.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  try {
    sharp = require("/app/node_modules/sharp");
  } catch (e) {
    console.error("sharp not found:", e.message);
    process.exit(1);
  }
}

const MEDIA_ROOT = process.env.MEDIA_ROOT || "/data/crazzycars/media";
const DIRS = ["products", "categories", "uploads", "blogs", "vehicles", "cars", "banners", "brand"];
const MASTER_RE = /\.(webp|jpe?g|png)$/i;
const SKIP_RE = /-(400|sm|800)\.(webp|jpe?g|png)$/i;

function listMasters(dir) {
  const abs = path.join(MEDIA_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => MASTER_RE.test(f) && !SKIP_RE.test(f))
    .map((f) => path.join(abs, f));
}

async function ensureDerivative(masterPath, suffix, maxEdge, quality) {
  const ext = path.extname(masterPath);
  const stem = masterPath.slice(0, -ext.length);
  const out = `${stem}-${suffix}.webp`;
  if (fs.existsSync(out)) return { status: "exists", out };
  try {
    await sharp(masterPath, { failOn: "none" })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toFile(out);
    // never leave a partial — sharp writes atomically to out
    return { status: "created", out };
  } catch (e) {
    return { status: "error", out, error: String(e.message || e).slice(0, 120) };
  }
}

async function main() {
  const stats = { masters: 0, smCreated: 0, smExists: 0, smErr: 0, fourCreated: 0, fourExists: 0, fourErr: 0 };
  const errors = [];
  for (const dir of DIRS) {
    const masters = listMasters(dir);
    for (const m of masters) {
      stats.masters++;
      const sm = await ensureDerivative(m, "sm", 1200, 78);
      if (sm.status === "created") stats.smCreated++;
      else if (sm.status === "exists") stats.smExists++;
      else {
        stats.smErr++;
        errors.push({ file: m, kind: "sm", error: sm.error });
      }
      const four = await ensureDerivative(m, "400", 400, 75);
      if (four.status === "created") stats.fourCreated++;
      else if (four.status === "exists") stats.fourExists++;
      else {
        stats.fourErr++;
        errors.push({ file: m, kind: "400", error: four.error });
      }
    }
  }
  console.log(JSON.stringify({ MEDIA_ROOT, stats, errorCount: errors.length, errors: errors.slice(0, 20) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
