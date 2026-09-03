#!/usr/bin/env node
/**
 * Audit media delivery for the catalog.
 *
 * Prefer local /media URLs. Cloudinary URLs are treated as failures when they 401/disabled.
 *
 * Usage:
 *   node --env-file=storecraft-store/.env.local scripts/audit-cloudinary-delivery.mjs
 *   node --env-file=storecraft-store/.env.local scripts/audit-cloudinary-delivery.mjs --sample 40
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(path.join(ROOT, "storecraft-store", "package.json"));
const mongoose = require("mongoose");

function argNum(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : fallback;
}

const SAMPLE = argNum("--sample", 40);
const MAX_FAIL_PCT = argNum("--max-fail-pct", 5);

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
const mediaRoot = process.env.MEDIA_ROOT || path.join(ROOT, "storecraft-store", "media");

function hostKey(url) {
  const u = String(url || "");
  if (/\/media\//i.test(u) || u.startsWith("/media/")) return "media";
  const m = u.match(/res\.cloudinary\.com\/([^/]+)/i);
  if (m) return m[1];
  try {
    return new URL(u).hostname;
  } catch {
    return "other";
  }
}

async function probe(url) {
  if (url.startsWith("/media/")) {
    const rel = url.replace(/^\/media\//, "");
    const abs = path.join(mediaRoot, rel);
    if (fs.existsSync(abs)) return { ok: true, via: "disk" };
    return { ok: false, reason: "missing-on-disk" };
  }
  const res = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "CrazzyCarsMediaAudit/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  const cldErr = res.headers.get("x-cld-error") || "";
  if (res.ok) return { ok: true, via: "http" };
  return { ok: false, reason: `${res.status}:${cldErr || "fail"}` };
}

async function main() {
  if (!mongoUri) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  console.log({ mediaRoot });

  await mongoose.connect(mongoUri);
  const products = await mongoose.connection.db
    .collection("products")
    .find({}, { projection: { slug: 1, "media.images.url": 1 } })
    .toArray();

  const hosts = {};
  const urls = [];
  for (const p of products) {
    for (const img of p.media?.images || []) {
      const u = typeof img === "string" ? img : img?.url;
      if (!u) continue;
      const h = hostKey(u);
      hosts[h] = (hosts[h] || 0) + 1;
      urls.push({ slug: p.slug, url: u, host: h });
    }
  }
  console.log("Catalog hosts:", hosts);

  const preferred = [...urls.filter((x) => x.host === "media"), ...urls.filter((x) => x.host !== "media")];
  const sample = preferred.slice(0, SAMPLE);
  let ok = 0;
  let fail = 0;
  const failReasons = {};
  for (const item of sample) {
    try {
      const r = await probe(item.url);
      if (r.ok) ok += 1;
      else {
        fail += 1;
        failReasons[r.reason] = (failReasons[r.reason] || 0) + 1;
        if (fail <= 8) console.error("FAIL", item.slug, r.reason, item.url.slice(0, 100));
      }
    } catch (e) {
      fail += 1;
      const key = `err:${String(e.message || e).slice(0, 80)}`;
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }

  const total = ok + fail;
  const failPct = total ? (fail / total) * 100 : 0;
  console.log(`Sample: ok=${ok} fail=${fail} (${failPct.toFixed(1)}%)`);
  if (Object.keys(failReasons).length) console.log("Fail reasons:", failReasons);

  await mongoose.disconnect();

  const cloudinaryLeft = Object.entries(hosts)
    .filter(([h]) => h !== "media" && !/shopify/i.test(h))
    .reduce((s, [, n]) => s + n, 0);
  if (cloudinaryLeft > 0) {
    console.warn(`WARNING: ${cloudinaryLeft} non-media remote URLs remain — rehost with scripts/rehost-media-to-vps.mjs`);
  }

  if (failPct > MAX_FAIL_PCT) {
    console.error(`FAIL: delivery failure ${failPct.toFixed(1)}% exceeds --max-fail-pct ${MAX_FAIL_PCT}`);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
