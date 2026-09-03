#!/usr/bin/env node
/**
 * Rehost categories / vehicles / car-catalog images from Shopify CDN
 * (and any still-live URLs) onto VPS MEDIA_ROOT.
 *
 * Usage:
 *   MEDIA_ROOT=/tmp/stage NEXT_PUBLIC_STORE_URL=https://crazzycars.pk \
 *     node --env-file=storecraft-store/.env.local \
 *     scripts/rehost-catalog-images.mjs --apply
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const UA = "CrazzyCarsCatalogRehost/1.0";

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

const require = createRequire(path.join(ROOT, "storecraft-store", "package.json"));
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

function publicUrl(rel) {
  return `${storeOrigin}/media/${rel.replace(/^\/+/, "")}`;
}

function isMedia(u) {
  return /crazzycars\.pk\/media\/|^\s*\/media\//i.test(String(u || ""));
}

function isDead(u) {
  return /res\.cloudinary\.com\/dquier8fv/i.test(String(u || ""));
}

function needsFix(u) {
  const s = String(u || "").trim();
  if (!s) return false;
  if (isMedia(s)) return false;
  return /res\.cloudinary\.com|cdn\.shopify\.com/i.test(s);
}

function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function loadSeedCategoryUrls() {
  /** @type {Map<string,string>} slug → shopify url */
  const map = new Map();
  const seedPath = path.join(ROOT, "storecraft-store", "scripts", "categories", "seedData.mjs");
  if (!fs.existsSync(seedPath)) return map;
  const text = fs.readFileSync(seedPath, "utf8");
  // crude parse of slug + imageUrl pairs in object literals
  const blocks = text.split(/\{\s*\n/);
  for (const block of blocks) {
    const slug = block.match(/slug:\s*"([^"]+)"/);
    const img = block.match(/imageUrl:\s*"([^"]+)"/);
    if (slug && img) map.set(slug[1], img[1]);
  }
  return map;
}

function loadMigrationMaps() {
  /** @type {Map<string,string>} cloudinaryOrAny → shopify */
  const byNew = new Map();
  const paths = [
    path.join(ROOT, "data", "shopify-image-migration.csv"),
    path.join(ROOT, "..", "Sialkot Motorsports", "data", "shopify-image-migration.csv"),
  ];
  for (const csvPath of paths) {
    if (!fs.existsSync(csvPath)) continue;
    const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) continue;
    const cols = parseCsvLine(lines[0]);
    const oldi = cols.indexOf("oldUrl");
    const newi = cols.indexOf("newUrl");
    if (oldi < 0 || newi < 0) continue;
    for (const line of lines.slice(1)) {
      const parts = parseCsvLine(line);
      const oldUrl = parts[oldi] || "";
      const newUrl = parts[newi] || "";
      if (!oldUrl || !newUrl) continue;
      byNew.set(newUrl, oldUrl);
      byNew.set(newUrl.split("?")[0], oldUrl);
      // also map basename of cloudinary asset
      const bn = newUrl.split("?")[0].split("/").pop();
      if (bn) byNew.set(`bn:${bn}`, oldUrl);
    }
  }
  return byNew;
}

function candidatesFor(url, map, seedUrl) {
  const out = [];
  if (seedUrl) out.push(seedUrl);
  const u = String(url || "").trim();
  if (!u) return [...new Set(out.filter(Boolean))];
  if (!isDead(u) && !/res\.cloudinary\.com/i.test(u)) out.push(u);
  const shop = map.get(u) || map.get(u.split("?")[0]);
  if (shop) out.push(shop);
  const bn = u.split("?")[0].split("/").pop();
  if (bn && map.get(`bn:${bn}`)) out.push(map.get(`bn:${bn}`));
  if (isDead(u)) {
    out.push(u.replace("/dquier8fv/", "/djmqim946/"));
  }
  return [...new Set(out.filter(Boolean))];
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("too small");
  const ct = res.headers.get("content-type") || "";
  return { buf, ct };
}

function extOf(url, ct) {
  const m = String(url).match(/\.(webp|jpe?g|png|gif|avif)(?:\?|$)/i);
  if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("png")) return ".png";
  return ".jpg";
}

function safeStem(s) {
  return (
    String(s || "asset")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "asset"
  );
}

function saveFile(folder, stem, buf, ext) {
  const dir = path.join(mediaRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
  const filename = `${safeStem(stem)}-${hash}${ext}`;
  const abs = path.join(dir, filename);
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, buf);
  const rel = path.join(folder, filename).replace(/\\/g, "/");
  return { rel, url: publicUrl(rel), abs };
}

async function resolveToMedia(url, folder, stem, map, cache, seedUrl) {
  if (isMedia(url)) return String(url).startsWith("/media/") ? publicUrl(url.replace(/^\/media\//, "")) : url;
  const cacheKey = `${url}||${seedUrl || ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const cands = candidatesFor(url, map, seedUrl);
  let lastErr = null;
  for (const cand of cands) {
    try {
      const { buf, ct } = await download(cand);
      const saved = saveFile(folder, stem, buf, extOf(cand, ct));
      cache.set(cacheKey, saved.url);
      return saved.url;
    } catch (e) {
      lastErr = e;
    }
  }
  cache.set(cacheKey, null);
  if (lastErr) throw lastErr;
  throw new Error("no candidates");
}

async function main() {
  if (!mongoUri) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  const map = loadMigrationMaps();
  const seedUrls = loadSeedCategoryUrls();
  console.log({ APPLY, mediaRoot, storeOrigin, migrationEntries: map.size, seedSlugs: seedUrls.size });
  fs.mkdirSync(mediaRoot, { recursive: true });

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const cache = new Map();
  const report = { categories: 0, vehicles: 0, carcatalogs: 0, failed: 0, failures: [] };

  // Fallback: first product image already on /media per category id/slug
  const catIdToSlug = new Map();
  for (const c of await db.collection("categories").find({}).project({ slug: 1 }).toArray()) {
    catIdToSlug.set(String(c._id), c.slug);
  }
  const productFallback = new Map();
  for (const p of await db
    .collection("products")
    .find({ "media.images.url": /crazzycars\.pk\/media\// })
    .project({ categories: 1, "media.images.url": 1 })
    .toArray()) {
    const u = p.media?.images?.[0]?.url;
    if (!u) continue;
    for (const c of p.categories || []) {
      const id = String(typeof c === "object" && c?._id ? c._id : c);
      const slug = catIdToSlug.get(id) || (typeof c === "object" ? c.slug : null);
      if (slug && !productFallback.has(slug)) productFallback.set(slug, u);
    }
  }
  console.log("productFallback slugs", productFallback.size);

  // Categories — image.url object or string imageUrl
  for (const doc of await db.collection("categories").find({}).toArray()) {
    const img = doc.image;
    const url = typeof img === "string" ? img : img?.url || doc.imageUrl;
    if (!needsFix(url) && !(!url && seedUrls.get(doc.slug))) continue;
    const seedUrl = seedUrls.get(doc.slug);
    try {
      let neu;
      try {
        neu = await resolveToMedia(url || seedUrl, "categories", doc.slug || doc.name || "category", map, cache, seedUrl);
      } catch (e) {
        const fb = productFallback.get(doc.slug);
        if (!fb) throw e;
        // copy existing media URL as-is (already on VPS)
        neu = fb;
      }
      if (!APPLY) {
        report.categories += 1;
        continue;
      }
      if (img && typeof img === "object") {
        await db.collection("categories").updateOne(
          { _id: doc._id },
          { $set: { "image.url": neu, "image.publicId": `local:${neu.split("/media/")[1] || ""}`, updatedAt: new Date() } }
        );
      } else if (doc.imageUrl) {
        await db.collection("categories").updateOne(
          { _id: doc._id },
          { $set: { imageUrl: neu, updatedAt: new Date() } }
        );
      } else {
        await db.collection("categories").updateOne(
          { _id: doc._id },
          { $set: { image: { ...(typeof img === "object" ? img : {}), url: neu }, updatedAt: new Date() } }
        );
      }
      report.categories += 1;
    } catch (e) {
      report.failed += 1;
      if (report.failures.length < 30) {
        report.failures.push({ type: "category", slug: doc.slug, error: String(e.message || e).slice(0, 120) });
      }
    }
  }

  // Vehicles — image string
  for (const doc of await db.collection("vehicles").find({}).toArray()) {
    const url = typeof doc.image === "string" ? doc.image : doc.image?.url || doc.imageUrl || doc.coverImage;
    if (!needsFix(url)) continue;
    try {
      const neu = await resolveToMedia(url, "cars", doc.slug || doc.name || "vehicle", map, cache);
      if (APPLY) {
        const set = { updatedAt: new Date() };
        if (typeof doc.image === "string" || doc.image == null) set.image = neu;
        else set["image.url"] = neu;
        if (doc.imageUrl) set.imageUrl = neu;
        if (doc.coverImage) set.coverImage = neu;
        await db.collection("vehicles").updateOne({ _id: doc._id }, { $set: set });
      }
      report.vehicles += 1;
    } catch (e) {
      report.failed += 1;
      if (report.failures.length < 30) {
        report.failures.push({ type: "vehicle", slug: doc.slug, error: String(e.message || e).slice(0, 120) });
      }
    }
  }

  // Car catalogs — logo + models[].image
  for (const doc of await db.collection("carcatalogs").find({}).toArray()) {
    let dirty = false;
    const next = { ...doc };

    if (needsFix(doc.logo)) {
      try {
        next.logo = await resolveToMedia(doc.logo, "cars", `${doc.slug || doc.name}-logo`, map, cache);
        dirty = true;
        report.carcatalogs += 1;
      } catch (e) {
        report.failed += 1;
        if (report.failures.length < 30) {
          report.failures.push({ type: "carcatalog-logo", slug: doc.slug, error: String(e.message || e).slice(0, 120) });
        }
      }
    }

    if (Array.isArray(doc.models)) {
      next.models = doc.models.map((m) => ({ ...m }));
      for (let i = 0; i < next.models.length; i += 1) {
        const m = next.models[i];
        const url = m?.image || m?.imageUrl;
        if (!needsFix(url)) continue;
        try {
          const neu = await resolveToMedia(url, "cars", `${doc.slug || "brand"}-${m.slug || m.name || i}`, map, cache);
          next.models[i] = { ...m, image: neu };
          dirty = true;
          report.carcatalogs += 1;
        } catch (e) {
          report.failed += 1;
          if (report.failures.length < 30) {
            report.failures.push({
              type: "carcatalog-model",
              slug: `${doc.slug}/${m.slug || i}`,
              error: String(e.message || e).slice(0, 120),
            });
          }
        }
      }
    }

    if (APPLY && dirty) {
      const { _id, ...rest } = next;
      await db.collection("carcatalogs").updateOne(
        { _id: doc._id },
        { $set: { logo: rest.logo, models: rest.models, updatedAt: new Date() } }
      );
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) console.log("Dry run — re-run with --apply");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
