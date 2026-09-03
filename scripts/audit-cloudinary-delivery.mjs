#!/usr/bin/env node
/**
 * Audit product (and optional settings) Cloudinary delivery.
 *
 * Exits 1 when the configured cloud is disabled, credentials fail, or more
 * than --max-fail-pct of sampled delivery URLs fail.
 *
 * Usage (repo root):
 *   node --env-file=storecraft-store/.env.local scripts/audit-cloudinary-delivery.mjs
 *   node --env-file=storecraft-store/.env.local scripts/audit-cloudinary-delivery.mjs --sample 40
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(path.join(ROOT, "storecraft-admin", "package.json"));
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");

function argNum(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : fallback;
}

const SAMPLE = argNum("--sample", 40);
const MAX_FAIL_PCT = argNum("--max-fail-pct", 5);

const cloud =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
const mongoUri = process.env.MONGODB_URI || "";

function cloudFromUrl(url) {
  const m = String(url || "").match(/res\.cloudinary\.com\/([^/]+)\//i);
  return m?.[1] || "";
}

async function headOrGet(url) {
  const ctrl = AbortSignal.timeout(15_000);
  let res = await fetch(url, {
    method: "HEAD",
    headers: { "User-Agent": "CrazzyCarsCloudinaryAudit/1.0" },
    signal: ctrl,
  }).catch(() => null);
  if (!res || res.status === 405 || res.status === 501) {
    res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "CrazzyCarsCloudinaryAudit/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
  }
  return res;
}

async function main() {
  if (!mongoUri) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  if (!cloud || !apiKey || !apiSecret) {
    console.error("Cloudinary env incomplete (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)");
    process.exit(2);
  }

  cloudinary.config({ cloud_name: cloud, api_key: apiKey, api_secret: apiSecret, secure: true });

  console.log(`Configured cloud: ${cloud}`);
  try {
    await cloudinary.api.ping();
    console.log("Admin API ping: OK");
  } catch (err) {
    const msg = err?.error?.message || err?.message || String(err);
    console.error(`Admin API ping: FAIL — ${msg}`);
    if (/disabled/i.test(msg)) {
      console.error(
        "\nROOT CAUSE: Cloudinary account/cloud is DISABLED. Reactivate billing in the Cloudinary console."
      );
      console.error("Storefront code cannot restore delivery while the cloud stays disabled.");
    }
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const products = await mongoose.connection.db
    .collection("products")
    .find({}, { projection: { slug: 1, "media.images.url": 1 } })
    .toArray();

  const clouds = {};
  const urls = [];
  for (const p of products) {
    for (const img of p.media?.images || []) {
      const u = typeof img === "string" ? img : img?.url;
      if (!u || !/res\.cloudinary\.com/i.test(u)) continue;
      const c = cloudFromUrl(u) || "other";
      clouds[c] = (clouds[c] || 0) + 1;
      urls.push({ slug: p.slug, url: u, cloud: c });
    }
  }

  console.log("Catalog URL clouds:", clouds);
  const foreign = Object.keys(clouds).filter((c) => c !== cloud);
  if (foreign.length) {
    console.warn(
      `WARNING: dual-cloud catalog — configured=${cloud}, also sees ${foreign.join(", ")}. One disabled cloud can blank most of the shop.`
    );
  }

  // Prefer sampling the configured cloud first, then others
  const preferred = urls.filter((x) => x.cloud === cloud);
  const other = urls.filter((x) => x.cloud !== cloud);
  const sample = [...preferred, ...other].slice(0, SAMPLE);

  let ok = 0;
  let fail = 0;
  const failReasons = {};
  for (const item of sample) {
    try {
      const res = await headOrGet(item.url);
      const cldErr = res.headers.get("x-cld-error") || "";
      if (res.ok) {
        ok += 1;
      } else {
        fail += 1;
        const key = `${res.status}:${cldErr || "no-x-cld-error"}`.slice(0, 120);
        failReasons[key] = (failReasons[key] || 0) + 1;
        if (fail <= 5) console.error(`FAIL ${res.status} ${cldErr} ${item.slug}`);
      }
    } catch (e) {
      fail += 1;
      const key = `err:${String(e.message || e).slice(0, 80)}`;
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }

  const total = ok + fail;
  const failPct = total ? (fail / total) * 100 : 0;
  console.log(`Delivery sample: ok=${ok} fail=${fail} (${failPct.toFixed(1)}% fail of ${total})`);
  if (Object.keys(failReasons).length) console.log("Fail reasons:", failReasons);

  await mongoose.disconnect();

  if (failPct > MAX_FAIL_PCT) {
    console.error(`\nFAIL: delivery failure ${failPct.toFixed(1)}% exceeds --max-fail-pct ${MAX_FAIL_PCT}`);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
