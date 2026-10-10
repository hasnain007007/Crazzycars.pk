#!/usr/bin/env node
/**
 * Phase 5 SEO verification against a running storefront (local or staging).
 *
 *   BASE_URL=http://127.0.0.1:3000 node scripts/seo-verify/verify-seo-2026-10.mjs
 *   BASE_URL=https://crazzycars.pk node scripts/seo-verify/verify-seo-2026-10.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLLECTIONS_REDIRECT_MAP,
} from "../../storecraft-store/lib/collectionRedirectMap.mjs";
import {
  PRODUCT_FALLBACK_REDIRECTS,
  resolveProductRedirectPath,
} from "../../storecraft-store/lib/productFallbackRedirects.mjs";
import {
  PAGE_SEO_OVERRIDES,
  assertSeoLengths,
  RANKING_PAGES_H1_LOCKED,
  PRODUCT_H1_OVERRIDES,
} from "../../storecraft-store/lib/seo/gscAudit2026-10.mjs";

const BASE = (process.env.BASE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.error("FAIL:", msg);
}
function ok(msg) {
  console.log("OK:", msg);
}

async function fetchOnce(url, { redirect = "manual" } = {}) {
  const res = await fetch(url, {
    redirect,
    headers: { "user-agent": "seo-verify-2026-10" },
  });
  const body = redirect === "manual" && (res.status === 301 || res.status === 308)
    ? ""
    : await res.text();
  return { status: res.status, location: res.headers.get("location") || "", body };
}

async function followOneHop(path) {
  const url = `${BASE}${path}`;
  const first = await fetchOnce(url, { redirect: "manual" });
  if (![301, 308].includes(first.status)) {
    return { ok: false, detail: `${path} expected 301/308 got ${first.status}` };
  }
  let loc = first.location;
  if (!loc) return { ok: false, detail: `${path} missing Location` };
  if (loc.startsWith("/")) loc = `${BASE}${loc}`;
  const second = await fetchOnce(loc, { redirect: "manual" });
  if ([301, 302, 307, 308].includes(second.status)) {
    return { ok: false, detail: `${path} chain: ${first.status}→${loc}→${second.status}` };
  }
  if (second.status !== 200) {
    return { ok: false, detail: `${path} target ${loc} status ${second.status}` };
  }
  return { ok: true, target: loc, body: second.body };
}

function extractCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1] : "";
}
function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}
function extractMetaDesc(html) {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].trim() : "";
}
function countH1(html) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}
function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

async function main() {
  console.log(`Verifying against ${BASE}`);

  // Length unit-style check on override table
  for (const [p, pair] of Object.entries(PAGE_SEO_OVERRIDES)) {
    for (const e of assertSeoLengths(pair, p)) fail(e);
  }

  // Collection redirects
  for (const [handle, dest] of Object.entries(COLLECTIONS_REDIRECT_MAP)) {
    const r = await followOneHop(`/collections/${handle}`);
    if (!r.ok) fail(r.detail);
    else {
      const finalPath = new URL(r.target).pathname.replace(/\/+$/, "") || "/";
      if (finalPath !== dest.replace(/\/+$/, "")) {
        fail(`/collections/${handle} → ${finalPath} expected ${dest}`);
      } else ok(`/collections/${handle} → ${dest}`);
    }
  }

  // Product fallbacks + sample /products/
  const productSamples = [
    "/products/car-heads-up-display-hud",
    "/products/canbus-bright-led-indicator-bulbs-2-pcs-crazzycars-pk",
    "/pages/contact-1",
    "/collections/all",
  ];
  for (const p of productSamples) {
    const r = await followOneHop(p);
    if (!r.ok) fail(r.detail);
    else ok(`${p} → ${r.target}`);
  }
  for (const handle of Object.keys(PRODUCT_FALLBACK_REDIRECTS).filter((h) => !h.endsWith("-crazzycars-pk"))) {
    const expected = resolveProductRedirectPath(handle);
    const r = await followOneHop(`/products/${handle}`);
    if (!r.ok) fail(r.detail);
    else {
      const finalPath = new URL(r.target).pathname;
      if (finalPath !== expected) fail(`/products/${handle} → ${finalPath} expected ${expected}`);
      else ok(`/products/${handle} → ${expected}`);
    }
  }

  // www (skip if BASE is not apex)
  if (BASE.includes("crazzycars.pk") && !BASE.includes("www.")) {
    const www = await fetchOnce(`https://www.crazzycars.pk/shop`, { redirect: "manual" });
    if (![301, 308].includes(www.status)) fail(`www shop status ${www.status}`);
    else if (!String(www.location).includes("crazzycars.pk") || String(www.location).includes("www.")) {
      fail(`www Location unexpected: ${www.location}`);
    } else ok("www → apex");
  }

  // Phase 2 pages: title/meta/h1
  for (const [p, pair] of Object.entries(PAGE_SEO_OVERRIDES)) {
    if (!pair.title && !pair.meta) continue;
    const res = await fetchOnce(`${BASE}${p === "/" ? "/" : p}`, { redirect: "follow" });
    if (res.status !== 200) {
      fail(`${p} status ${res.status}`);
      continue;
    }
    const title = extractTitle(res.body);
    const meta = extractMetaDesc(res.body);
    const h1n = countH1(res.body);
    if (h1n !== 1) fail(`${p} h1 count ${h1n}`);
    if (pair.title && title !== pair.title && !title.startsWith(pair.title)) {
      // Allow minor entity encoding differences
      const norm = (s) => s.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
      if (norm(title) !== norm(pair.title)) {
        fail(`${p} title "${title}" ≠ "${pair.title}"`);
      } else ok(`${p} title`);
    } else if (pair.title) ok(`${p} title`);
    if (pair.meta && meta) {
      const norm = (s) => s.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
      if (norm(meta) !== norm(pair.meta)) fail(`${p} meta mismatch`);
      else ok(`${p} meta`);
    }
    const canon = extractCanonical(res.body);
    if (canon && !canon.startsWith("https://crazzycars.pk")) {
      fail(`${p} canonical not apex: ${canon}`);
    }
    if (canon && (/\/products\//.test(canon) || /\/collections\//.test(canon) || /www\./.test(canon))) {
      fail(`${p} bad canonical: ${canon}`);
    }
  }

  // Ranking H1 lock (except AC panel)
  for (const p of RANKING_PAGES_H1_LOCKED) {
    const res = await fetchOnce(`${BASE}${p}`, { redirect: "follow" });
    if (res.status !== 200) {
      fail(`ranking ${p} status ${res.status}`);
      continue;
    }
    ok(`ranking URL live ${p} h1=${extractH1(res.body).slice(0, 60)}`);
  }
  {
    const p = "/toyota-corolla-2012-top-ac-panel";
    const res = await fetchOnce(`${BASE}${p}`, { redirect: "follow" });
    const h1 = extractH1(res.body);
    const expected = PRODUCT_H1_OVERRIDES["toyota-corolla-2012-top-ac-panel"];
    if (expected && h1 !== expected) fail(`${p} H1 "${h1}" ≠ expected`);
    else ok(`${p} H1 fixed`);
  }

  // Sitemaps
  const index = await fetchOnce(`${BASE}/sitemap.xml`, { redirect: "follow" });
  if (index.status !== 200) fail("sitemap.xml");
  const childNames = [
    "sitemap-pages.xml",
    "sitemap-categories.xml",
    "sitemap-cars.xml",
    "sitemap-blog.xml",
    "sitemap-products.xml",
  ];
  for (const name of childNames) {
    const res = await fetchOnce(`${BASE}/${name}`, { redirect: "follow" });
    if (res.status !== 200) {
      fail(`${name} status ${res.status}`);
      continue;
    }
    if (/www\.crazzycars\.pk|\/products\/|\/collections\//i.test(res.body)) {
      fail(`${name} contains non-canonical URLs`);
    }
    const locs = [...res.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    // Sample up to 15 URLs
    for (const loc of locs.slice(0, 15)) {
      if (!loc.startsWith("https://crazzycars.pk/")) {
        fail(`${name} loc host ${loc}`);
        continue;
      }
      if (/\?page=/.test(loc)) {
        fail(`${name} paginated loc ${loc}`);
        continue;
      }
      const page = await fetchOnce(loc, { redirect: "follow" });
      if (page.status !== 200) {
        fail(`${loc} status ${page.status}`);
        continue;
      }
      const canon = extractCanonical(page.body);
      if (canon && canon.split("?")[0] !== loc.split("?")[0]) {
        // allow trailing slash diffs
        const a = canon.replace(/\/$/, "");
        const b = loc.replace(/\/$/, "");
        if (a !== b) fail(`${loc} canonical ${canon}`);
      }
    }
    ok(`${name} sampled`);
  }

  const reportPath = path.join(ROOT, "scripts/seo-verify/last-report.txt");
  fs.writeFileSync(
    reportPath,
    [`BASE ${BASE}`, `failures ${failures.length}`, ...failures].join("\n")
  );
  console.log(`\nReport: ${reportPath}`);
  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
