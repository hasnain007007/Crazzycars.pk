#!/usr/bin/env node
/**
 * Fix wrong / external product images that break Google Merchant Center.
 *
 * IMPORTANT: production store uses VPS Mongo (`sialkot-mongo`), not Atlas.
 * Prefer running inside the store container:
 *   docker exec -w /app <store> node /tmp/fix-vps-merchant-images.js
 *
 * Local Atlas (.env.local) is only a mirror / leftover — updating it alone
 * will not change https://crazzycars.pk/feed/products.xml.
 *
 * Usage (local staging of JPEGs + scp media files):
 *   MERCHANT_IMAGE_PUBLIC_ORIGIN=https://crazzycars.pk \
 *     node --env-file=storecraft-store/.env.local \
 *     scripts/fix-merchant-product-images.mjs --apply --scp
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const DO_SCP = process.argv.includes("--scp");
const VPS_HOST = process.env.VPS_HOST || "root@panel.crazzycars.pk";
const VPS_MEDIA = process.env.VPS_MEDIA || "/data/crazzycars/media/products";

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
const sharp = require("sharp");

const mongoUri = process.env.MONGODB_URI || "";
// Production media URLs only — never write localhost from local .env.
const storeOrigin = String(
  process.env.MERCHANT_IMAGE_PUBLIC_ORIGIN || "https://crazzycars.pk"
)
  .replace(/\/$/, "")
  .replace(/\/media$/i, "")
  .replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i, "https://crazzycars.pk");

const STAGE = path.join(ROOT, ".tmp", "merchant-image-fix");
fs.mkdirSync(STAGE, { recursive: true });

function publicProductUrl(filename) {
  return `${storeOrigin}/media/products/${filename}`;
}

function sha10(buf) {
  return createHash("sha1").update(buf).digest("hex").slice(0, 10);
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsMerchantImageFix/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`too small ${buf.length}`);
  return buf;
}

async function fetchVpsFile(filename) {
  return download(publicProductUrl(filename));
}

async function toMerchantJpeg(buf, stem) {
  const out = await sharp(buf)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: false })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  const filename = `${stem}-1-${sha10(out)}.jpg`;
  const abs = path.join(STAGE, filename);
  fs.writeFileSync(abs, out);
  return { filename, abs, buf: out, url: publicProductUrl(filename) };
}

function imgEntry(url, isMain = false) {
  return { url, isMain: Boolean(isMain), alt: "" };
}

function scpToVps(files) {
  if (!files.length) return;
  const args = [...files.map((f) => f.abs), `${VPS_HOST}:${VPS_MEDIA}/`];
  const r = spawnSync("scp", ["-o", "StrictHostKeyChecking=no", ...args], {
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error("scp failed");
}

/** Map articleNo → existing VPS product filenames (already live). */
const RELINK = {
  "CC-LGT-203": [
    "honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights-1-3ff0543e9e.webp",
  ],
  "CC-COR-GRL-TRD-09": [
    "toyota-corolla-trd-style-front-grille-gloss-black-abs-1-5b3b1314d9.webp",
  ],
  // Closest correct universal canard asset (gloss black canards) — not Mark X spoiler.
  "CC-UNI-CANARD-1": [
    "universal-front-splitter-style-4-gloss-black-canard-3pcs-1-6267f55d74.webp",
    "universal-front-splitter-style-4-gloss-black-canard-3pcs-2-034216a978.webp",
  ],
};

/** Products with no recoverable matching photos — drop wrong media + exclude from Merchant. */
const EXCLUDE_UNTIL_PHOTOS = [
  "CC-UNI-HUM-LSR-001",
  "CC-UNI-LED-DEYE",
  "CC-VEZ-DRL-HD011",
  "CC-UNI-LED-REFL",
  "CC-PRI-LOUV-12",
];

/** Force JPEG rehost (cache-bust + Merchant-friendly) for Google image issues. */
const JPEG_REFRESH = [
  {
    articleNo: "CC-0118",
    stem: "toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic",
    source:
      "toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic-1-1a61785d31.webp",
  },
  {
    articleNo: "CC-EXT-130",
    stem: "mark-x-spoiler-unpainted-abs-2004-2009",
    source: "mark-x-spoiler-unpainted-abs-2004-2009-1-d6f806266f.webp",
  },
  {
    articleNo: "CC-0181",
    stem: "4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable",
    source:
      "4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable-1-1f6b902689.webp",
  },
  {
    articleNo: "CC-UNI-CANARD-1",
    stem: "universal-front-bumper-splitter-canard-1pcs-matt-black-abs",
    source:
      "universal-front-splitter-style-4-gloss-black-canard-3pcs-1-6267f55d74.webp",
  },
];

async function rehostWelcomeLogo(Product) {
  const doc = await Product.findOne({ slug: "car-door-welcome-logo-lights" });
  if (!doc) {
    console.log("skip welcome logo — product missing");
    return [];
  }
  const imgs = doc.media?.images || [];
  const shopify = imgs.filter((i) => /cdn\.shopify\.com/i.test(i.url || ""));
  if (!shopify.length) {
    console.log("welcome logo already local?");
    return [];
  }
  // Prefer JPEGs; cap at 8 images for Merchant.
  const preferred = [
    ...shopify.filter((i) => /\.jpe?g(\?|$)/i.test(i.url)),
    ...shopify.filter((i) => /\.png(\?|$)/i.test(i.url)),
  ].slice(0, 8);

  const staged = [];
  const next = [];
  let n = 1;
  for (const im of preferred) {
    const buf = await download(im.url);
    const jpg = await sharp(buf)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: false })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const filename = `car-door-welcome-logo-lights-${n}-${sha10(jpg)}.jpg`;
    const abs = path.join(STAGE, filename);
    fs.writeFileSync(abs, jpg);
    staged.push({ abs, filename });
    next.push(imgEntry(publicProductUrl(filename), n === 1));
    n += 1;
  }
  console.log(
    `${APPLY ? "APPLY" : "DRY"} welcome logo → ${next.length} local JPGs (was ${shopify.length} Shopify)`
  );
  if (APPLY) {
    await Product.updateOne(
      { _id: doc._id },
      {
        $set: {
          "media.images": next,
          updatedAt: new Date(),
        },
        $unset: { "seo.excludeFromMerchantFeed": "" },
      }
    );
  }
  return staged;
}

async function main() {
  if (!mongoUri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(mongoUri);
  const Product = mongoose.connection.collection("products");
  const staged = [];

  // 1) Relink to correct existing VPS assets
  for (const [articleNo, files] of Object.entries(RELINK)) {
    const doc = await Product.findOne({ articleNo });
    if (!doc) {
      console.log("missing", articleNo);
      continue;
    }
    const images = files.map((f, i) => imgEntry(publicProductUrl(f), i === 0));
    console.log(
      `${APPLY ? "APPLY" : "DRY"} relink ${articleNo} ${doc.slug} → ${files[0]}`
    );
    if (APPLY) {
      await Product.updateOne(
        { _id: doc._id },
        {
          $set: { "media.images": images, updatedAt: new Date() },
          $unset: { "seo.excludeFromMerchantFeed": "" },
        }
      );
    }
  }

  // 2) Exclude products with no recoverable matching photos
  for (const articleNo of EXCLUDE_UNTIL_PHOTOS) {
    const doc = await Product.findOne({ articleNo });
    if (!doc) continue;
    console.log(
      `${APPLY ? "APPLY" : "DRY"} exclude-from-merchant ${articleNo} ${doc.slug} (wrong image, no asset)`
    );
    if (APPLY) {
      await Product.updateOne(
        { _id: doc._id },
        {
          $set: {
            "seo.excludeFromMerchantFeed": true,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // 3) Welcome logo Shopify → local JPG
  staged.push(...(await rehostWelcomeLogo(Product)));

  // 4) JPEG refresh for Merchant image-processing failures
  for (const row of JPEG_REFRESH) {
    const doc = await Product.findOne({ articleNo: row.articleNo });
    if (!doc) continue;
    const srcBuf = await fetchVpsFile(row.source);
    const jpeg = await toMerchantJpeg(srcBuf, row.stem);
    staged.push(jpeg);
    const extras = (doc.media?.images || [])
      .map((i) => i.url)
      .filter((u) => u && !/cdn\.shopify\.com|res\.cloudinary\.com/i.test(u))
      .filter((u) => !u.includes(jpeg.filename));
    const images = [
      imgEntry(jpeg.url, true),
      ...extras.slice(0, 9).map((u) => imgEntry(u, false)),
    ];
    console.log(
      `${APPLY ? "APPLY" : "DRY"} jpeg-refresh ${row.articleNo} → ${jpeg.filename} (${jpeg.buf.length}b)`
    );
    if (APPLY) {
      await Product.updateOne(
        { _id: doc._id },
        {
          $set: { "media.images": images, updatedAt: new Date() },
          $unset: { "seo.excludeFromMerchantFeed": "" },
        }
      );
    }
  }

  if (APPLY && DO_SCP && staged.length) {
    console.log(`scp ${staged.length} files → ${VPS_HOST}:${VPS_MEDIA}`);
    scpToVps(staged);
  } else if (staged.length) {
    console.log(
      `staged ${staged.length} files in ${STAGE}${APPLY ? " (pass --scp to upload)" : ""}`
    );
  }

  await mongoose.disconnect();
  console.log(APPLY ? "done" : "dry-run complete — re-run with --apply --scp");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
