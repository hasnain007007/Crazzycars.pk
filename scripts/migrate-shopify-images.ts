#!/usr/bin/env node
/**
 * Copy cdn.shopify.com images onto this store's live Cloudinary and
 * rewrite the CMS field they came from.
 *
 * Adapted for Crazzycars.pk from the Sialkot/Gujranwala migrate script.
 * Target cloud: dquier8fv (confirmed dominant on the live homepage).
 * Folder prefix: storecraft/crazzycars/…/rehost
 *
 * Does not delete anything on Shopify.
 *
 * Usage (repo root):
 *   node --experimental-strip-types --env-file=storecraft-store/.env.local \
 *     scripts/migrate-shopify-images.ts
 *   node --experimental-strip-types --env-file=storecraft-store/.env.local \
 *     scripts/migrate-shopify-images.ts --apply
 *
 * Dry run (default): download + upload if needed, write CSV, no Mongo writes.
 * --apply: same, then write Cloudinary URLs back onto the source fields.
 *
 * Idempotent: URLs already on Cloudinary, or listed in a previous CSV /
 * rehost map, are not uploaded again.
 *
 * Mongo: walks every string field in every collection (same shape as Sialkot —
 * Product.media.images[].url, Category.imageUrl, settings banners, etc.).
 * No field-name renames needed for this twin.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "shopify-image-migration.csv");
/** Live Cloudinary cloud for Crazzycars.pk — do not upload elsewhere. */
const TARGET_CLOUD = "dquier8fv";
const FOLDER_ROOT = "storecraft/crazzycars";
const UA = "CrazzyCarsShopifyMigrate/1.0";

const PRIOR_MAPS = [
  path.join(
    ROOT,
    "storecraft-store",
    "scripts",
    "vehicles",
    "data",
    "shopify-cdn-rehost-mongo.json"
  ),
  path.join(
    ROOT,
    "storecraft-store",
    "scripts",
    "vehicles",
    "data",
    "shopify-cdn-rehost-map.json"
  ),
];

const require = createRequire(path.join(ROOT, "storecraft-store", "package.json"));
const mongoose = require("mongoose") as typeof import("mongoose");

const APPLY = process.argv.includes("--apply");
const SHOPIFY_RE = /cdn\.shopify\.com/i;
const CLOUDINARY_RE = /res\.cloudinary\.com/i;

const SKIP_COLLECTIONS = new Set([
  "postexwebhooklogs",
  "activitylogs",
  "loginattempts",
  "cartsessions",
  "livepresences",
  "dailyvisitors",
  "aiagentvisits",
]);

type Hit = {
  collection: string;
  docId: string;
  fieldPath: string;
  url: string;
};

type CsvRow = {
  collection: string;
  docId: string;
  fieldPath: string;
  oldUrl: string;
  newUrl: string;
  bytes: string;
  status: string;
  note: string;
};

function loadEnvFallbacks() {
  const envPath = path.join(ROOT, "storecraft-store", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFallbacks();

const cloud =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
const mongoUri = process.env.MONGODB_URI || "";

function csvEscape(value: string) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(rows: CsvRow[]) {
  const header = [
    "collection",
    "docId",
    "fieldPath",
    "oldUrl",
    "newUrl",
    "bytes",
    "status",
    "note",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.collection,
        r.docId,
        r.fieldPath,
        r.oldUrl,
        r.newUrl,
        r.bytes,
        r.status,
        r.note,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, `${lines.join("\n")}\n`);
}

function readPriorCsv(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(CSV_PATH)) return map;
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return map;
  const cols = lines[0].split(",");
  const oldi = cols.indexOf("oldUrl");
  const newi = cols.indexOf("newUrl");
  const stati = cols.indexOf("status");
  if (oldi < 0 || newi < 0) return map;
  for (const line of lines.slice(1)) {
    const parts: string[] = [];
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
    const oldUrl = parts[oldi] || "";
    const newUrl = parts[newi] || "";
    const status = stati >= 0 ? parts[stati] : "";
    if (!oldUrl || !newUrl || !CLOUDINARY_RE.test(newUrl)) continue;
    if (status === "failed") continue;
    map.set(stripQuery(oldUrl), newUrl);
  }
  return map;
}

function loadJsonMap(file: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(file)) return map;
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  const obj =
    raw &&
    typeof raw === "object" &&
    (raw as { map?: unknown }).map &&
    typeof (raw as { map?: unknown }).map === "object"
      ? ((raw as { map: Record<string, unknown> }).map)
      : (raw as Record<string, unknown>);
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v !== "string") continue;
    if (!SHOPIFY_RE.test(k) || !CLOUDINARY_RE.test(v)) continue;
    map.set(stripQuery(k), v);
  }
  return map;
}

function stripQuery(url: string) {
  return String(url || "").split("?")[0];
}

/** Folder + filename, ignoring Cloudinary version/transform segments. */
function cloudinaryAssetKey(url: string) {
  const u = stripQuery(url);
  const m = u.match(/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/(.+)$/i);
  if (!m) return u;
  let rest = m[1];
  while (rest) {
    const seg = rest.split("/")[0];
    if (!seg) break;
    const transform =
      /^v\d+$/.test(seg) ||
      seg.includes(",") ||
      /^(f_|q_|w_|h_|c_|g_|e_|b_|dpr_|fl_)/.test(seg);
    if (!transform) break;
    rest = rest.slice(seg.length + 1);
  }
  return rest;
}

function walk(value: unknown, fieldPath: string, acc: { path: string; url: string }[]) {
  if (value == null) return;
  if (typeof value === "string") {
    if (SHOPIFY_RE.test(value) || CLOUDINARY_RE.test(value)) {
      acc.push({ path: fieldPath, url: value });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${fieldPath}[${i}]`, acc));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "_id") continue;
      walk(v, fieldPath ? `${fieldPath}.${k}` : k, acc);
    }
  }
}

function folderFor(collection: string) {
  if (collection === "vehicles" || collection === "carcatalogs" || collection === "carmodels") {
    return `${FOLDER_ROOT}/cars/rehost`;
  }
  if (collection === "categories") return `${FOLDER_ROOT}/categories/rehost`;
  return `${FOLDER_ROOT}/products/rehost`;
}

function stemFromUrl(url: string) {
  const base = stripQuery(url).split("/").pop() || "image";
  return base
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function publicIdFor(url: string) {
  const hash = createHash("sha1").update(stripQuery(url)).digest("hex").slice(0, 10);
  return `${stemFromUrl(url)}-${hash}`;
}

function mimeToExt(mime: string, fallback: string) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  return fallback || "jpg";
}

async function download(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = mimeToExt(
    res.headers.get("content-type") || "",
    (stripQuery(url).match(/\.([a-z0-9]+)$/i) || [, "jpg"])[1]
  );
  return { buf, mime: (res.headers.get("content-type") || "image/jpeg").split(";")[0], ext };
}

async function uploadToCloudinary(opts: {
  buf: Buffer;
  mime: string;
  folder: string;
  publicId: string;
}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${opts.folder}&public_id=${opts.publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");
  const dataUri = `data:${opts.mime};base64,${opts.buf.toString("base64")}`;
  const body = new URLSearchParams({
    file: dataUri,
    api_key: apiKey,
    timestamp: String(timestamp),
    folder: opts.folder,
    public_id: opts.publicId,
    signature,
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message || `upload ${res.status}`);
  }
  return json.secure_url;
}

async function headStatus(url: string) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (res.status === 405 || res.status === 501) {
      const g = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": UA, Range: "bytes=0-0" },
        redirect: "follow",
      });
      return g.status;
    }
    return res.status;
  } catch {
    return 0;
  }
}

function scanRepoHardcoded(): Hit[] {
  const hits: Hit[] = [];
  const roots = [
    path.join(ROOT, "storecraft-store", "app"),
    path.join(ROOT, "storecraft-store", "components"),
    path.join(ROOT, "storecraft-store", "lib"),
  ];
  const skip = new Set(["node_modules", ".next", "data"]);
  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walkDir(full);
        continue;
      }
      if (!/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(ent.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      const re = /https:\/\/cdn\.shopify\.com[^"'\\\s)]+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        hits.push({
          collection: "code",
          docId: path.relative(ROOT, full),
          fieldPath: "hardcoded",
          url: m[0],
        });
      }
    }
  }
  for (const r of roots) walkDir(r);
  return hits;
}

async function main() {
  if (!cloud || !apiKey || !apiSecret) {
    console.error(`Missing Cloudinary credentials (${TARGET_CLOUD} expected).`);
    process.exit(1);
  }
  if (!mongoUri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  if (cloud !== TARGET_CLOUD) {
    console.error(
      `Refusing to upload: live cloud should be ${TARGET_CLOUD}, got ${cloud}`
    );
    process.exit(1);
  }

  const known = new Map<string, string>();
  for (const file of PRIOR_MAPS) {
    for (const [k, v] of loadJsonMap(file)) known.set(k, v);
  }
  for (const [k, v] of readPriorCsv()) known.set(k, v);
  const reverse = new Map<string, string>();
  for (const [oldUrl, neu] of known) {
    reverse.set(stripQuery(neu), oldUrl);
    reverse.set(cloudinaryAssetKey(neu), oldUrl);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 12000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("no db");

  const shopifyHits: Hit[] = [];
  const already: Hit[] = [];
  const names = await db.listCollections().toArray();
  for (const { name } of names) {
    if (SKIP_COLLECTIONS.has(name)) continue;
    const cursor = db.collection(name).find({});
    for await (const doc of cursor) {
      const acc: { path: string; url: string }[] = [];
      walk(doc, "", acc);
      for (const item of acc) {
        const hit: Hit = {
          collection: name,
          docId: String(doc._id),
          fieldPath: item.path.replace(/^\./, ""),
          url: item.url,
        };
        if (SHOPIFY_RE.test(item.url)) shopifyHits.push(hit);
        else if (
          CLOUDINARY_RE.test(item.url) &&
          (reverse.has(stripQuery(item.url)) || reverse.has(cloudinaryAssetKey(item.url)))
        ) {
          already.push(hit);
        }
      }
    }
  }

  const codeHits = scanRepoHardcoded();
  shopifyHits.push(...codeHits.filter((h) => SHOPIFY_RE.test(h.url)));

  const rows: CsvRow[] = [];
  const uploaded = new Map<string, string>();

  async function resolveNew(oldUrl: string, collection: string): Promise<CsvRow> {
    const key = stripQuery(oldUrl);
    if (uploaded.has(key)) {
      return {
        collection: "",
        docId: "",
        fieldPath: "",
        oldUrl,
        newUrl: uploaded.get(key) || "",
        bytes: "0",
        status: "skipped_existing",
        note: "same-run cache",
      };
    }
    if (known.has(key)) {
      const neu = known.get(key) || "";
      uploaded.set(key, neu);
      return {
        collection: "",
        docId: "",
        fieldPath: "",
        oldUrl,
        newUrl: neu,
        bytes: "0",
        status: "skipped_existing",
        note: "prior map / csv",
      };
    }
    const { buf, mime } = await download(oldUrl);
    const neu = await uploadToCloudinary({
      buf,
      mime,
      folder: folderFor(collection),
      publicId: publicIdFor(oldUrl),
    });
    uploaded.set(key, neu);
    known.set(key, neu);
    return {
      collection: "",
      docId: "",
      fieldPath: "",
      oldUrl,
      newUrl: neu,
      bytes: String(buf.length),
      status: "uploaded",
      note: APPLY ? "dry-run-upload-then-apply" : "dry-run-upload",
    };
  }

  for (const hit of already) {
    rows.push({
      collection: hit.collection,
      docId: hit.docId,
      fieldPath: hit.fieldPath,
      oldUrl:
        reverse.get(stripQuery(hit.url)) || reverse.get(cloudinaryAssetKey(hit.url)) || "",
      newUrl: hit.url,
      bytes: "0",
      status: "already_migrated",
      note: "field already Cloudinary (from prior Shopify copy)",
    });
  }

  for (const hit of shopifyHits) {
    if (hit.collection === "code") {
      let resolved: CsvRow;
      try {
        resolved = await resolveNew(hit.url, "categories");
      } catch (e) {
        resolved = {
          collection: hit.collection,
          docId: hit.docId,
          fieldPath: hit.fieldPath,
          oldUrl: hit.url,
          newUrl: "",
          bytes: "0",
          status: "failed",
          note: (e as Error).message,
        };
        rows.push(resolved);
        continue;
      }
      rows.push({
        ...resolved,
        collection: hit.collection,
        docId: hit.docId,
        fieldPath: hit.fieldPath,
        note: `${resolved.note}; hardcoded — not auto-edited`,
      });
      continue;
    }

    let resolved: CsvRow;
    try {
      resolved = await resolveNew(hit.url, hit.collection);
    } catch (e) {
      rows.push({
        collection: hit.collection,
        docId: hit.docId,
        fieldPath: hit.fieldPath,
        oldUrl: hit.url,
        newUrl: "",
        bytes: "0",
        status: "failed",
        note: (e as Error).message,
      });
      continue;
    }
    rows.push({
      ...resolved,
      collection: hit.collection,
      docId: hit.docId,
      fieldPath: hit.fieldPath,
    });
  }

  if (APPLY) {
    let written = 0;
    for (const hit of shopifyHits) {
      if (hit.collection === "code") continue;
      const neu = uploaded.get(stripQuery(hit.url)) || known.get(stripQuery(hit.url));
      if (!neu) continue;
      const mongoPath = hit.fieldPath.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
      let _id: unknown = hit.docId;
      try {
        _id = new mongoose.Types.ObjectId(hit.docId);
      } catch {
        /* keep string */
      }
      const r = await db.collection(hit.collection).updateOne({ _id }, { $set: { [mongoPath]: neu } });
      written += r.modifiedCount;
    }
    console.log(`apply: fields written ${written}`);
  }

  const uniqueOld = [...new Set(rows.map((r) => stripQuery(r.oldUrl)).filter(Boolean))];
  const shopifyHeads = new Map<string, number>();
  for (const oldUrl of uniqueOld) {
    if (!SHOPIFY_RE.test(oldUrl)) continue;
    shopifyHeads.set(oldUrl, await headStatus(oldUrl));
  }
  for (const r of rows) {
    const st = shopifyHeads.get(stripQuery(r.oldUrl));
    if (st == null) continue;
    r.note = `${r.note}; shopify_http=${st}`;
  }

  writeCsv(rows);
  const shopifyCount = shopifyHits.length;
  const uploadedCount = rows.filter((r) => r.status === "uploaded").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const headOk = [...shopifyHeads.values()].filter((s) => s >= 200 && s < 400).length;
  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        cloud,
        targetCloud: TARGET_CLOUD,
        folderRoot: FOLDER_ROOT,
        mongoDb: mongoose.connection.name,
        shopifyFieldHits: shopifyCount,
        alreadyMigratedRows: already.length,
        codeHardcoded: codeHits.length,
        uploadedThisRun: uploadedCount,
        failed,
        uniqueShopifyUrls: uniqueOld.filter((u) => SHOPIFY_RE.test(u)).length,
        shopifyHeadOk: headOk,
        shopifyHeadChecked: shopifyHeads.size,
        csv: path.relative(ROOT, CSV_PATH),
        csvRows: rows.length,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
