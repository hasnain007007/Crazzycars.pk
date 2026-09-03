#!/usr/bin/env node
/**
 * Apply recovered product images (named {slug}-N.ext) onto VPS media + Mongo.
 *
 * Usage:
 *   node --env-file=storecraft-store/.env.local \
 *     scripts/apply-recovered-images-by-slug.mjs \
 *     --from-dir=/Users/mac/Desktop/crazzycars-product-images \
 *     --apply
 *
 * Dry run (default): report matches only.
 * --apply: write files under MEDIA_ROOT and rewrite product media.images URLs.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const fromDirArg = process.argv.find((a) => a.startsWith("--from-dir="));
const FROM_DIR = fromDirArg
  ? fromDirArg.slice("--from-dir=".length)
  : path.join(ROOT, "..", "crazzycars-product-images");

function loadEnvFallbacks() {
  for (const rel of ["storecraft-store/.env.local", "storecraft-admin/.env.local"]) {
    const envPath = path.join(ROOT, rel);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFallbacks();

const require = createRequire(
  fs.existsSync(path.join(ROOT, "storecraft-store", "package.json"))
    ? path.join(ROOT, "storecraft-store", "package.json")
    : "/app/package.json"
);
const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "";
const mediaRoot = process.env.MEDIA_ROOT || path.join(ROOT, "storecraft-store", "media");
const storeOrigin = (
  process.env.MEDIA_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_STORE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://crazzycars.pk"
)
  .replace(/\/$/, "")
  .replace(/\/media$/i, "");

function baseSlug(s) {
  let x = String(s || "")
    .toLowerCase()
    .trim();
  for (const suf of ["-crazzycars-pk", "-sialkotmotorsports"]) {
    if (x.endsWith(suf)) x = x.slice(0, -suf.length);
  }
  return x;
}

function publicUrl(rel) {
  return `${storeOrigin}/media/${rel.replace(/^\/+/, "")}`;
}

function indexRecoveredDir(dir) {
  /** @type {Map<string, {abs:string,n:number,ext:string}[]>} */
  const bySlug = new Map();
  if (!fs.existsSync(dir)) throw new Error(`from-dir missing: ${dir}`);
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    if (!fs.statSync(abs).isFile()) continue;
    if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(name)) continue;
    const m = name.match(/^(.+)-(\d+)\.([a-z0-9]+)$/i);
    if (!m) continue;
    const key = baseSlug(m[1]);
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push({ abs, n: Number(m[2]), ext: m[3].toLowerCase() });
  }
  for (const [, arr] of bySlug) arr.sort((a, b) => a.n - b.n);
  return bySlug;
}

function needsRehost(product) {
  const imgs = product.media?.images || [];
  if (!imgs.length) return true;
  return imgs.some((img) => {
    const u = typeof img === "string" ? img : img?.url || "";
    return !u || /dquier8fv|res\.cloudinary\.com/i.test(u);
  });
}

async function main() {
  if (!mongoUri) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  const recovered = indexRecoveredDir(FROM_DIR);
  console.log({ APPLY, FROM_DIR, mediaRoot, storeOrigin, recoveredSlugs: recovered.size });

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const col = mongoose.connection.db.collection("products");
  const products = await col.find({}).project({ slug: 1, name: 1, articleNo: 1, media: 1 }).toArray();

  let matched = 0;
  let skippedOk = 0;
  let noFiles = 0;
  let rewritten = 0;
  let filesWritten = 0;

  fs.mkdirSync(path.join(mediaRoot, "products"), { recursive: true });

  for (const p of products) {
    const key = baseSlug(p.slug);
    const files = recovered.get(key) || recovered.get(baseSlug(p.slug?.replace(/-crazzycars.*$/, ""))) || [];
    if (!files.length) {
      if (needsRehost(p)) noFiles += 1;
      else skippedOk += 1;
      continue;
    }
    if (!needsRehost(p)) {
      // still refresh if currently on cloudinary
      const stillRemote = (p.media?.images || []).some((img) =>
        /res\.cloudinary\.com/i.test(typeof img === "string" ? img : img?.url || "")
      );
      if (!stillRemote) {
        skippedOk += 1;
        continue;
      }
    }
    matched += 1;

    const newImages = [];
    for (const f of files) {
      const buf = fs.readFileSync(f.abs);
      const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
      const filename = `${key}-${f.n}-${hash}.${f.ext}`;
      const rel = `products/${filename}`;
      const abs = path.join(mediaRoot, rel);
      if (APPLY) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        if (!fs.existsSync(abs)) {
          fs.writeFileSync(abs, buf);
          filesWritten += 1;
        }
      }
      const prev = (p.media?.images || [])[f.n - 1] || {};
      newImages.push({
        ...(typeof prev === "object" && prev ? prev : {}),
        url: publicUrl(rel),
        publicId: `local:${rel}`,
        isMain: f.n === 1 || Boolean(prev.isMain),
        altText: prev.altText || p.name || key,
        width: prev.width,
        height: prev.height,
        finalSize: buf.length,
        originalSize: buf.length,
      });
    }
    if (newImages.length && !newImages.some((i) => i.isMain)) newImages[0].isMain = true;

    if (APPLY) {
      await col.updateOne(
        { _id: p._id },
        {
          $set: {
            "media.images": newImages,
            updatedAt: new Date(),
          },
        }
      );
      rewritten += 1;
    }
  }

  console.log({
    products: products.length,
    matchedWithRecoveredFiles: matched,
    alreadyOkSkipped: skippedOk,
    stillMissingNoFiles: noFiles,
    rewritten,
    filesWritten,
  });
  if (!APPLY) console.log("Dry run only — re-run with --apply to write media + Mongo.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
