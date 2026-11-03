#!/usr/bin/env node
/**
 * Fuzzy-match known 404 car-part URLs to active product/category/car slugs.
 * Writes docs/seo/404-candidates.csv — owner must approve before enabling redirects.
 * Does NOT change data. Run: node scripts/seo/fuzzy-404-candidates.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const CANDIDATES = [
  "/honda-civic-11th-gen-2022-2026-carbon-fiber-steering-wheel-paddle-shifters-pair",
  "/honda-city-2021-2026-carbon-fiber-gear-lever-knob-cover",
  "/honda-civic-reborn-2006-2012-carbon-door-handle-cover-set",
  "/toyota-corolla-2014-2026-side-mirror-neon-style-indicator",
  "/usb-led-car-roof-star-projector-light",
  "/mg-logo-seat-belt-clip-2pcs",
  "/universal-car-anti-rust-door-lock-cover-4pcs",
  "/universal-lime-green-fog-light-led-h11-pair",
  "/categories/head-lights",
  "/cars/suzuki-mehran-1989-2019",
  "/cars/byd-shark6-2025-present",
];

function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function score(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size);
}

async function fetchSlugs() {
  const base = process.env.SITE_URL || "https://crazzycars.pk";
  const out = [];
  for (const sm of ["/sitemap-products.xml", "/sitemap-categories.xml", "/sitemap-cars.xml"]) {
    try {
      const xml = await (await fetch(`${base}${sm}`, { redirect: "follow" })).text();
      for (const m of xml.matchAll(/https?:\/\/[^<]+\/((?:categories|cars)\/)?([^</]+)/g)) {
        const prefix = m[1] || "";
        const slug = m[2];
        if (!slug || slug.includes("?")) continue;
        out.push(`/${prefix}${slug}`.replace(/\/+/g, "/"));
      }
    } catch {
      /* offline — empty */
    }
  }
  return [...new Set(out)];
}

async function main() {
  const live = await fetchSlugs();
  const rows = [["old", "best_match", "score", "note"]];
  for (const old of CANDIDATES) {
    let best = "";
    let bestScore = 0;
    for (const cand of live) {
      const s = score(old, cand);
      if (s > bestScore) {
        bestScore = s;
        best = cand;
      }
    }
    const note =
      bestScore >= 0.55
        ? "owner-approve-to-redirect"
        : bestScore > 0
          ? "weak-match-review"
          : "no-match";
    rows.push([old, best, bestScore.toFixed(3), note]);
  }
  const outPath = path.join(root, "docs/seo/404-candidates.csv");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rows.map((r) => r.join(",")).join("\n") + "\n");
  console.log(`Wrote ${outPath} (${rows.length - 1} candidates, ${live.length} live slugs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
