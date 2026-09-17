#!/usr/bin/env node
/**
 * Build /media/products/*-400.webp thumbs for product grid cards.
 *
 * On VPS (store container, MEDIA_ROOT mounted):
 *   docker cp scripts/build-product-thumbs-400.mjs <cid>:/tmp/
 *   docker exec -w /app <cid> node /tmp/build-product-thumbs-400.mjs --apply
 *
 * Local dry-run against a folder:
 *   MEDIA_ROOT=./storecraft-store/media node scripts/build-product-thumbs-400.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function loadEnv() {
  for (const rel of ["storecraft-store/.env.local", "storecraft-admin/.env.local"]) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const mediaRoot = process.env.MEDIA_ROOT || path.join(ROOT, "storecraft-store", "media");
const productsDir = path.join(mediaRoot, "products");

const require = createRequire(
  fs.existsSync(path.join(ROOT, "storecraft-store", "package.json"))
    ? path.join(ROOT, "storecraft-store", "package.json")
    : "/app/package.json"
);
const sharp = require("sharp");

const EXT_RE = /\.(webp|jpe?g|png|gif|avif)$/i;

function thumbName(filename) {
  return filename.replace(EXT_RE, "-400.webp");
}

async function main() {
  if (!fs.existsSync(productsDir)) {
    throw new Error(`products dir missing: ${productsDir}`);
  }
  const files = fs
    .readdirSync(productsDir)
    .filter((n) => EXT_RE.test(n) && !/-400\.(webp|jpe?g|png)$/i.test(n));

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of files) {
    const abs = path.join(productsDir, name);
    const outName = thumbName(name);
    const outAbs = path.join(productsDir, outName);
    if (!FORCE && fs.existsSync(outAbs)) {
      skipped += 1;
      continue;
    }
    if (!APPLY) {
      made += 1;
      continue;
    }
    try {
      await sharp(abs)
        .rotate()
        .resize(400, 400, { fit: "cover", position: "centre", withoutEnlargement: false })
        .webp({ quality: 72, effort: 4 })
        .toFile(outAbs);
      made += 1;
      if (made % 50 === 0) console.log(`… ${made} thumbs`);
    } catch (e) {
      failed += 1;
      console.warn("fail", name, e.message);
    }
  }

  console.log(
    `${APPLY ? "APPLY" : "DRY"} dir=${productsDir} candidates=${files.length} made=${made} skipped=${skipped} failed=${failed}`
  );
  if (!APPLY) console.log("Re-run with --apply to write files.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
