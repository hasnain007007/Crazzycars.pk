#!/usr/bin/env node
/**
 * Rehost catalog images onto the local VPS media volume and rewrite Mongo URLs.
 *
 * Sources (tried in order per URL):
 *  1. Already a /media or MEDIA_PUBLIC URL → skip
 *  2. Live HTTP fetch of current URL (works for djmqim946 / Shopify / anything still 200)
 *  3. Shopify oldUrl from data/shopify-image-migration.csv (by matching newUrl or basename)
 *  4. Optional merchant zip: --from-zip=/path/to/images.zip (match by filename stem)
 *
 * Usage (repo root):
 *   node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs
 *   node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs --apply
 *   node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs --apply --from-zip=./product-photos.zip
 *
 * Dry run (default): download candidates, write under MEDIA_ROOT, print report — no Mongo writes.
 * --apply: also rewrite Mongo string fields to public /media URLs.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "shopify-image-migration.csv");
const REPORT_PATH = path.join(ROOT, "data", "media-rehost-report.json");
const UA = "CrazzyCarsMediaRehost/1.0";

const require = createRequire(
  fs.existsSync(path.join(ROOT, "storecraft-store", "package.json"))
    ? path.join(ROOT, "storecraft-store", "package.json")
    : fs.existsSync("/app/package.json")
      ? "/app/package.json"
      : path.join(process.cwd(), "package.json")
);
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const fromZipArg = process.argv.find((a) => a.startsWith("--from-zip="));
const FROM_ZIP = fromZipArg ? fromZipArg.slice("--from-zip=".length) : "";

const SKIP_COLLECTIONS = new Set([
  "postexwebhooklogs",
  "activitylogs",
  "loginattempts",
  "cartsessions",
  "livepresences",
  "dailyvisitors",
  "aiagentvisits",
]);

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

const mongoUri = process.env.MONGODB_URI || "";
const mediaRoot =
  process.env.MEDIA_ROOT ||
  path.join(ROOT, "storecraft-store", "media");
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

function isMediaUrl(url) {
  const u = String(url || "");
  if (/\/media\//i.test(u)) return true;
  if (u.startsWith("/media/")) return true;
  return false;
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function extFromUrlOrType(url, contentType) {
  const m = String(url).match(/\.(webp|jpe?g|png|gif|avif|mp4|webm)(?:\?|$)/i);
  if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("gif")) return ".gif";
  if (contentType?.includes("mp4")) return ".mp4";
  return ".jpg";
}

function safeStem(input) {
  return String(input || "asset")
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "asset";
}

function walk(value, pathSoFar, out) {
  if (typeof value === "string") {
    if (isHttpUrl(value) || value.startsWith("/media/")) {
      out.push({ path: pathSoFar, url: value });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${pathSoFar}[${i}]`, out));
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    walk(v, pathSoFar ? `${pathSoFar}.${k}` : k, out);
  }
}

function setByPath(doc, fieldPath, newUrl) {
  const parts = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(fieldPath))) {
    parts.push(m[1] !== undefined ? m[1] : Number(m[2]));
  }
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cur = cur[parts[i]];
    if (cur == null) return false;
  }
  const last = parts[parts.length - 1];
  if (cur == null || !(last in cur) && cur[last] === undefined) {
    if (Array.isArray(cur) && typeof last === "number") {
      cur[last] = newUrl;
      return true;
    }
  }
  cur[last] = newUrl;
  return true;
}

function loadShopifyMap() {
  /** @type {Map<string, string>} cloudinaryOrAny → shopify */
  const byNew = new Map();
  const byBase = new Map();
  if (!fs.existsSync(CSV_PATH)) return { byNew, byBase };
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { byNew, byBase };
  // naive CSV split respecting quotes
  function parseLine(line) {
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
  const cols = parseLine(lines[0]);
  const oldi = cols.indexOf("oldUrl");
  const newi = cols.indexOf("newUrl");
  if (oldi < 0 || newi < 0) return { byNew, byBase };
  for (const line of lines.slice(1)) {
    const parts = parseLine(line);
    const oldUrl = parts[oldi] || "";
    const newUrl = parts[newi] || "";
    if (!oldUrl || !newUrl) continue;
    byNew.set(newUrl, oldUrl);
    byNew.set(newUrl.split("?")[0], oldUrl);
    const base = path.basename(newUrl.split("?")[0]);
    if (base) byBase.set(base, oldUrl);
    const stem = safeStem(base);
    if (stem) byBase.set(stem, oldUrl);
  }
  return { byNew, byBase };
}

async function extractZipIndex(zipPath) {
  /** @type {Map<string, Buffer>} */
  const index = new Map();
  if (!zipPath) return index;
  if (!fs.existsSync(zipPath)) {
    console.warn("Zip not found:", zipPath);
    return index;
  }
  let AdmZip;
  try {
    AdmZip = require("adm-zip");
  } catch {
    console.warn("adm-zip not installed — skipping --from-zip (npm i adm-zip in storecraft-store if needed)");
    return index;
  }
  const zip = new AdmZip(zipPath);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = path.basename(entry.entryName);
    if (!/\.(webp|jpe?g|png|gif|avif)$/i.test(name)) continue;
    const buf = entry.getData();
    index.set(name.toLowerCase(), buf);
    index.set(safeStem(name), buf);
  }
  console.log(`Zip index: ${index.size / 2} files from ${zipPath}`);
  return index;
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.cld = res.headers.get("x-cld-error") || "";
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  return { buf, ct };
}

async function saveBuffer(folder, stem, buf, ext) {
  const dir = path.join(mediaRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
  const filename = `${safeStem(stem)}-${hash}${ext}`;
  const abs = path.join(dir, filename);
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(abs, buf);
  }
  const rel = path.join(folder, filename).replace(/\\/g, "/");
  return { abs, rel, url: publicUrl(rel) };
}

async function main() {
  if (!mongoUri) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  fs.mkdirSync(mediaRoot, { recursive: true });
  console.log({ APPLY, mediaRoot, storeOrigin, fromZip: FROM_ZIP || null });

  const shopify = loadShopifyMap();
  const zipIndex = await extractZipIndex(FROM_ZIP);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const report = {
    scanned: 0,
    alreadyMedia: 0,
    downloaded: 0,
    rewritten: 0,
    failed: 0,
    failures: [],
    bySource: { live: 0, shopifyCsv: 0, zip: 0 },
  };

  const urlCache = new Map(); // oldUrl → newUrl

  const names = await db.listCollections().toArray();
  for (const { name } of names) {
    if (SKIP_COLLECTIONS.has(name)) continue;
    const col = db.collection(name);
    const cursor = col.find({});
    for await (const doc of cursor) {
      const hits = [];
      walk(doc, "", hits);
      let dirty = false;
      for (const hit of hits) {
        const url = hit.url;
        if (!url || (!isHttpUrl(url) && !url.startsWith("/media/"))) continue;
        // Only migrate remote image-like hosts we care about (+ any http image field)
        if (!isMediaUrl(url) && !/cloudinary|shopify|\/media\//i.test(url) && !/\.(webp|jpe?g|png|gif)(\?|$)/i.test(url)) {
          continue;
        }
        report.scanned += 1;

        if (isMediaUrl(url)) {
          report.alreadyMedia += 1;
          continue;
        }

        if (urlCache.has(url)) {
          const neu = urlCache.get(url);
          if (APPLY && neu !== url) {
            setByPath(doc, hit.path.replace(/^\./, ""), neu);
            dirty = true;
            report.rewritten += 1;
          }
          continue;
        }

        let buf = null;
        let ext = ".jpg";
        let source = "";

        // zip by basename / stem of cloudinary public id
        const base = path.basename(url.split("?")[0]);
        const stem = safeStem(base.replace(/\.[a-z0-9]+$/i, ""));
        if (zipIndex.size) {
          const z = zipIndex.get(base.toLowerCase()) || zipIndex.get(stem);
          if (z) {
            buf = z;
            ext = path.extname(base) || ".jpg";
            source = "zip";
          }
        }

        if (!buf) {
          try {
            const got = await fetchBuffer(url);
            buf = got.buf;
            ext = extFromUrlOrType(url, got.ct);
            source = "live";
          } catch (e) {
            const alt = shopify.byNew.get(url) || shopify.byNew.get(url.split("?")[0]) || shopify.byBase.get(base) || shopify.byBase.get(stem);
            if (alt) {
              try {
                const got = await fetchBuffer(alt);
                buf = got.buf;
                ext = extFromUrlOrType(alt, got.ct);
                source = "shopifyCsv";
              } catch (e2) {
                report.failed += 1;
                if (report.failures.length < 40) {
                  report.failures.push({
                    collection: name,
                    id: String(doc._id),
                    path: hit.path,
                    url: url.slice(0, 160),
                    error: `${e.message}${e.cld ? ` (${e.cld})` : ""}; shopifyAlt: ${e2.message}`,
                  });
                }
                urlCache.set(url, null);
                continue;
              }
            } else {
              report.failed += 1;
              if (report.failures.length < 40) {
                report.failures.push({
                  collection: name,
                  id: String(doc._id),
                  path: hit.path,
                  url: url.slice(0, 160),
                  error: `${e.message}${e.cld ? ` (${e.cld})` : ""}`,
                });
              }
              urlCache.set(url, null);
              continue;
            }
          }
        }

        const folder =
          name === "products"
            ? "products"
            : name === "categories"
              ? "categories"
              : name === "banners"
                ? "banners"
                : "uploads";
        const saved = await saveBuffer(folder, stem || name, buf, ext);
        urlCache.set(url, saved.url);
        report.downloaded += 1;
        report.bySource[source] = (report.bySource[source] || 0) + 1;

        if (APPLY) {
          setByPath(doc, hit.path.replace(/^\./, ""), saved.url);
          dirty = true;
          report.rewritten += 1;
        }
      }
      if (APPLY && dirty) {
        await col.replaceOne({ _id: doc._id }, doc);
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report: ${REPORT_PATH}`);
  if (!APPLY) {
    console.log("Dry run only — re-run with --apply to rewrite Mongo.");
  }

  await mongoose.disconnect();
  if (report.failed > 0 && report.downloaded === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
