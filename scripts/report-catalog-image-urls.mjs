#!/usr/bin/env node
/**
 * Count image URL shapes in a local catalog DB (Cloudinary vs /media vs relative vs empty).
 * SAFETY: localhost host + DB name must contain "local".
 *
 *   MONGODB_URI='mongodb://127.0.0.1:27028/crazzycars_local_real' \
 *     node scripts/report-catalog-image-urls.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storeRoot = path.resolve(__dirname, "../storecraft-store");
const require = createRequire(path.join(storeRoot, "package.json"));
const { MongoClient } = require("mongodb");

const URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

function assertSafeUri(uri) {
  if (!uri?.trim()) throw new Error("MONGODB_URI is required.");
  let parsed;
  try {
    parsed = new URL(uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"));
  } catch {
    throw new Error(`Invalid MONGODB_URI: ${uri}`);
  }
  const host = (parsed.hostname || "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Refusing non-localhost host: ${host}`);
  }
  const dbName = (parsed.pathname || "").replace(/^\//, "").split("?")[0] || "";
  if (!dbName.toLowerCase().includes("local")) {
    throw new Error(`Refusing DB without "local" in name: ${dbName}`);
  }
  return dbName;
}

function classify(url) {
  const s = String(url || "").trim();
  if (!s) return "empty";
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(s)) return "cloudinary_https";
  if (/^https?:\/\//i.test(s) && /\/media\//i.test(s)) return "media_absolute";
  if (/^https?:\/\//i.test(s)) return "other_absolute";
  if (s.startsWith("/media/") || s.startsWith("media/")) return "media_relative";
  if (s.startsWith("/")) return "other_relative";
  if (s.startsWith("//")) return "protocol_relative";
  return "opaque_or_public_id";
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function collectUrl(map, url) {
  bump(map, classify(url));
  bump(map, "_total");
  const c = classify(url);
  if (c === "media_relative" || c === "other_relative" || c === "protocol_relative") {
    bump(map, "_needs_absolutize");
  }
}

async function main() {
  const dbName = assertSafeUri(URI);
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(dbName);

  const report = {
    db: dbName,
    products: {},
    categories: {},
    banners: {},
    blogs: {},
    vehicles: {},
  };

  for await (const p of db.collection("products").find({}, { projection: { "media.images.url": 1 } })) {
    const imgs = Array.isArray(p.media?.images) ? p.media.images : [];
    if (!imgs.length) collectUrl(report.products, "");
    for (const img of imgs) collectUrl(report.products, img?.url);
  }

  for await (const c of db.collection("categories").find({}, { projection: { image: 1 } })) {
    const url = typeof c.image === "string" ? c.image : c.image?.url;
    collectUrl(report.categories, url);
  }

  for await (const b of db.collection("banners").find(
    {},
    { projection: { "background.image.url": 1, "background.mobileImage.url": 1, "image.url": 1 } }
  )) {
    collectUrl(report.banners, b.background?.mobileImage?.url || b.background?.image?.url || b.image?.url);
  }

  for await (const p of db.collection("blogposts").find({}, { projection: { featuredImage: 1 } })) {
    const url = typeof p.featuredImage === "string" ? p.featuredImage : p.featuredImage?.url;
    collectUrl(report.blogs, url);
  }

  for await (const v of db.collection("vehicles").find({}, { projection: { image: 1 } })) {
    const url = typeof v.image === "string" ? v.image : v.image?.url;
    collectUrl(report.vehicles, url);
  }

  console.log(JSON.stringify(report, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
