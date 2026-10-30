#!/usr/bin/env node
/**
 * Post-deploy SEO crawl: reads sitemap.xml (and child sitemaps), fetches every URL and
 * prints the pages that fail. Read-only.
 *
 *   node --experimental-strip-types scripts/seo-audit.ts [--base https://crazzycars.pk] [--limit 50] [--concurrency 6]
 *
 * Checks: 200 status, exactly one <h1>, unique <title> ≤ 60 chars, meta description
 * 70–160 chars, self canonical, not noindex, no banned text (Sialkot, "Premium Car
 * Accessories", gujranwalamotorsports), JSON-LD by page type (product: Product + Offer +
 * shippingDetails + return policy; category: ItemList + AggregateOffer; car: BreadcrumbList;
 * home: AutoPartsStore / LocalBusiness). Exit code 1 when anything fails.
 */

type Failure = { url: string; check: string; detail: string };

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = opt("--base", "https://crazzycars.pk").replace(/\/$/, "");
const LIMIT = Number(opt("--limit", "0")) || Infinity;
const CONCURRENCY = Math.max(1, Number(opt("--concurrency", "6")) || 6);
const BANNED = [/sialkot/i, /premium car accessories/i, /gujranwalamotorsports/i];

async function get(url: string): Promise<{ status: number; text: string; finalUrl: string }> {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "CrazzyCars-SEO-audit/1.0" } });
  return { status: res.status, text: res.status === 200 ? await res.text() : "", finalUrl: url };
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function sitemapUrls(): Promise<string[]> {
  const root = await get(`${BASE}/sitemap.xml`);
  if (root.status !== 200) throw new Error(`sitemap.xml returned ${root.status}`);
  const first = locs(root.text);
  const children = first.filter((u) => /\.xml(\?|$)/.test(u));
  if (!children.length) return first;
  const urls: string[] = [];
  for (const child of children) {
    const r = await get(child);
    if (r.status !== 200) throw new Error(`${child} returned ${r.status}`);
    urls.push(...locs(r.text));
  }
  return [...new Set(urls)];
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function jsonLdTypes(html: string): { types: Set<string>; blobs: string[] } {
  const types = new Set<string>();
  const blobs: string[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    blobs.push(m[1]);
    for (const t of m[1].matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)) types.add(t[1]);
  }
  return { types, blobs };
}

function pageKind(url: string): "home" | "product" | "category" | "car" | "other" {
  const p = new URL(url).pathname;
  if (p === "/") return "home";
  if (p.startsWith("/categories/")) return "category";
  if (p.startsWith("/cars/")) return "car";
  if (/^\/[a-z0-9-]+$/.test(p) && !/^\/(about|contact|faq|shop|blog|blogs|posts|wishlist|compare|cars|categories|cash-on-delivery|advance-payment|returns-policy|shipping-policy|privacy-policy|terms-conditions|track-order|sale|car-accessories-[a-z]+)$/.test(p)) {
    return "product";
  }
  return "other";
}

async function audit(url: string, titles: Map<string, string[]>, fail: (c: string, d: string) => void) {
  const r = await get(url);
  if (r.status !== 200) return fail("status", `HTTP ${r.status}`);
  const html = r.text;
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail("h1", `${h1s} <h1> tags`);
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "").trim();
  if (!title) fail("title", "missing");
  else {
    if (title.length > 60) fail("title-length", `${title.length} chars: ${title}`);
    titles.set(title, [...(titles.get(title) || []), url]);
  }
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "").trim();
  if (desc.length < 70 || desc.length > 160) fail("meta-description", `${desc.length} chars`);
  const robots = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || "";
  if (/noindex/i.test(robots)) fail("robots", `in sitemap but ${robots}`);
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || "";
  if (canonical && canonical.replace(/\/$/, "") !== url.replace(/\/$/, "")) fail("canonical", `points to ${canonical}`);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ");
  for (const re of BANNED) if (re.test(visible)) fail("banned-text", String(re));

  const { types, blobs } = jsonLdTypes(html);
  const kind = pageKind(url);
  if (kind === "home" && !types.has("AutoPartsStore") && !types.has("LocalBusiness")) fail("jsonld-home", "no AutoPartsStore/LocalBusiness");
  if (kind === "category" && !(types.has("ItemList") && types.has("AggregateOffer"))) fail("jsonld-category", "needs ItemList + AggregateOffer");
  if (kind === "car" && !types.has("BreadcrumbList")) fail("jsonld-car", "no BreadcrumbList");
  if (kind === "product" && types.has("Product")) {
    const product = blobs.find((b) => /"@type"\s*:\s*"Product"/.test(b)) || "";
    for (const key of ["\"offers\"", "shippingDetails", "hasMerchantReturnPolicy"]) {
      if (!product.includes(key)) fail("jsonld-product", `missing ${key.replace(/"/g, "")}`);
    }
    const rating = product.match(/"aggregateRating"[\s\S]*?"reviewCount"\s*:\s*"?(\d+)/);
    if (rating && Number(rating[1]) < 1) fail("jsonld-product", "aggregateRating with 0 reviews");
  } else if (kind === "product") {
    fail("jsonld-product", "no Product schema (product URL in sitemap)");
  }
}

async function main() {
  const urls = (await sitemapUrls()).filter((u) => u.startsWith(BASE)).slice(0, LIMIT);
  const failures: Failure[] = [];
  const titles = new Map<string, string[]>();
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        await audit(url, titles, (check, detail) => failures.push({ url, check, detail }));
      } catch (e) {
        failures.push({ url, check: "fetch", detail: String((e as Error).message || e) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  for (const [title, list] of titles) {
    if (list.length > 1) for (const url of list) failures.push({ url, check: "title-duplicate", detail: title });
  }

  const byCheck = new Map<string, number>();
  for (const f of failures) byCheck.set(f.check, (byCheck.get(f.check) || 0) + 1);
  console.log(`SEO audit ${BASE}: ${urls.length} URLs, ${failures.length} failures`);
  for (const [check, n] of [...byCheck].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${check}`);
  for (const f of failures.sort((a, b) => a.check.localeCompare(b.check))) console.log(`${f.check}\t${f.url}\t${f.detail}`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
