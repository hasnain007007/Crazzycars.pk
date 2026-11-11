#!/usr/bin/env node
/**
 * SEO / AEO / GEO verifier — audit 2026-11-10 (C1–C22).
 *
 *   node scripts/seo-verify.mjs
 *   node scripts/seo-verify.mjs --base https://crazzycars.pk
 *   node scripts/seo-verify.mjs --base http://localhost:3000 --out seo-reports/local.json
 *   node scripts/seo-verify.mjs --checks C8,C13 --filter /cars/
 *
 * Writes JSON to seo-reports/<ISO-date>.json (or --out).
 * Prints: C1..C22: n passed, m failed
 * Never prints secrets. Concurrency capped at 4.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const BASE = (
  arg("--base") ||
  process.env.BASE_URL ||
  "https://crazzycars.pk"
).replace(/\/+$/, "");

const ISO_STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const OUT =
  arg("--out") ||
  process.env.OUT ||
  path.join(ROOT, "seo-reports", `${ISO_STAMP}.json`);

const CHECK_FILTER = new Set(
  String(arg("--checks") || process.env.CHECKS || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
);
const PATH_FILTER = arg("--filter") || process.env.PATH_FILTER || "";
const CONCURRENCY = Math.min(4, Number(process.env.SEO_VERIFY_CONCURRENCY) || 4);
const UA = "CrazzyCars-seo-verify/2026-11-10 (+https://crazzycars.pk)";
const FETCH_TIMEOUT_MS = Number(process.env.SEO_VERIFY_TIMEOUT_MS) || 25000;
const MAX_EXAMPLES = 10;
const STANDARD_SHIP_PKR = 250;
const BULKY_SHIP_PKR = 500;

/** @typedef {{ pass: boolean, count: number, failures: string[], note?: string }} CheckResult */

function emptyCheck() {
  return /** @type {CheckResult} */ ({ pass: true, count: 0, failures: [] });
}
function failCheck(check, msg) {
  check.pass = false;
  if (check.failures.length < MAX_EXAMPLES) check.failures.push(msg);
  else if (check.failures.length === MAX_EXAMPLES) {
    check.failures.push(`…(+more; capped at ${MAX_EXAMPLES})`);
  }
}

async function fetchOnce(url, { redirect = "manual", method = "GET", retries = 2 } = {}) {
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect,
        signal: ctrl.signal,
        headers: { "user-agent": UA, accept: "text/html,application/xml,text/plain,*/*" },
      });
      const buf = method === "HEAD" ? null : Buffer.from(await res.arrayBuffer());
      return {
        status: res.status,
        location: res.headers.get("location") || "",
        body: buf ? buf.toString("utf8") : "",
        bytes: buf ? buf.length : 0,
        finalUrl: res.url || url,
      };
    } catch (err) {
      const msg = String(err?.message || err || "");
      last = {
        status: 0,
        location: "",
        body: "",
        bytes: 0,
        finalUrl: url,
        error: msg.includes("abort") ? "timeout" : msg.slice(0, 120),
      };
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  return last;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function locTags(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

async function collectSitemapUrls(base) {
  const root = await fetchOnce(`${base}/sitemap.xml`, { redirect: "follow" });
  if (root.status !== 200) throw new Error(`sitemap.xml status ${root.status}`);
  const locs = locTags(root.body);
  const urls = new Set();
  const submaps = locs.filter((u) => /\.xml(\?|$)/i.test(u) || /sitemap/i.test(u));
  for (const u of locs.filter((x) => !submaps.includes(x))) urls.add(u.split("#")[0]);
  const subBodies = await mapPool(submaps, CONCURRENCY, async (sm) => {
    const r = await fetchOnce(sm, { redirect: "follow" });
    return { sm, status: r.status, locs: r.status === 200 ? locTags(r.body) : [] };
  });
  for (const s of subBodies) {
    for (const u of s.locs) urls.add(u.split("#")[0]);
  }
  return [...urls].sort();
}

function pathOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
}
function sameUrl(a, b) {
  try {
    const norm = (u) => {
      const x = new URL(u);
      return `${x.origin}${x.pathname.replace(/\/+$/, "") || "/"}${x.search}`;
    };
    return norm(a) === norm(b);
  } catch {
    return a === b;
  }
}

function stripChrome(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ");
}
function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
function visibleWordCount(html) {
  return wordCount(stripTags(stripChrome(html)));
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return decodeEntities(m ? m[1].replace(/\s+/g, " ").trim() : "");
}
function extractMetaDesc(html) {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return decodeEntities(m ? m[1].replace(/\s+/g, " ").trim() : "");
}
/** Character count for SEO title/description limits (codepoints, after entity decode). */
function charLen(s) {
  return [...String(s || "")].length;
}
function extractCanonical(html) {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1].trim() : "";
}
function extractRobotsMeta(html) {
  const m =
    html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']robots["']/i);
  return m ? m[1].toLowerCase() : "";
}
function countH1(html) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}

function extractJsonLdRaw(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    blocks.push(m[1].trim());
  }
  return blocks;
}
function parseJsonLd(html) {
  const parsed = [];
  const parseErrors = [];
  for (const raw of extractJsonLdRaw(html)) {
    try {
      parsed.push(JSON.parse(raw));
    } catch (e) {
      parseErrors.push(String(e?.message || e).slice(0, 80));
    }
  }
  return { parsed, parseErrors };
}
function walkLd(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) walkLd(n, out);
    return out;
  }
  if (typeof node === "object") {
    out.push(node);
    if (node["@graph"]) walkLd(node["@graph"], out);
  }
  return out;
}
function faqMainEntityCount(blocks) {
  let n = 0;
  for (const root of blocks) {
    for (const node of walkLd(root)) {
      const types = [].concat(node["@type"] || []).map(String);
      if (!types.includes("FAQPage")) continue;
      n += [].concat(node.mainEntity || []).length;
    }
  }
  return n;
}
function hasFaqPage(blocks) {
  for (const root of blocks) {
    for (const node of walkLd(root)) {
      if ([].concat(node["@type"] || []).map(String).includes("FAQPage")) return true;
    }
  }
  return false;
}
function productOffers(blocks) {
  const offers = [];
  for (const root of blocks) {
    for (const node of walkLd(root)) {
      if (![].concat(node["@type"] || []).map(String).includes("Product")) continue;
      for (const o of [].concat(node.offers || [])) {
        if (o && typeof o === "object") offers.push(o);
      }
    }
  }
  return offers;
}
function hasAggregateOrReview(blocks) {
  for (const root of blocks) {
    for (const node of walkLd(root)) {
      const types = [].concat(node["@type"] || []).map(String);
      if (types.includes("AggregateRating") || types.includes("Review")) return true;
      if (node.aggregateRating || node.review) return true;
    }
  }
  return false;
}
function visibleFaqQuestionCount(html) {
  const text = stripChrome(html);
  // Prefer explicit FAQ section headings / dt / accordion buttons after FAQ heading
  const faqHeading = /<(h2|h3)[^>]*>[^<]*(frequently asked|FAQ)[^<]*<\/\1>/i.exec(text);
  if (!faqHeading) return 0;
  const after = text.slice(faqHeading.index);
  const section = after.slice(0, 80000);
  const qHeads =
    (section.match(/<(h3|h4|dt|summary)[^>]*>[\s\S]*?<\/\1>/gi) || []).length ||
    (section.match(/itemprop=["']name["'][^>]*>/gi) || []).length;
  return qHeads;
}
function imagesMissingAlt(html) {
  const missing = [];
  const re = /<img\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    if (/\brole=["']presentation["']/i.test(attrs) || /\baria-hidden=["']true["']/i.test(attrs)) {
      continue;
    }
    const altM = attrs.match(/\balt=(["'])(.*?)\1/i);
    if (!altM || !String(altM[2]).trim()) {
      const src = (attrs.match(/\bsrc=(["'])(.*?)\1/i) || [])[2] || "(no src)";
      missing.push(src.slice(0, 120));
    }
  }
  return missing;
}
function llmsLinks(text, base) {
  const links = new Set();
  const abs = /https?:\/\/[^\s)\]>"']+/g;
  let m;
  while ((m = abs.exec(text))) {
    const u = m[0].replace(/[.,;]+$/, "").split("#")[0];
    if (u.startsWith(base) || u.startsWith("https://crazzycars.pk")) links.add(u);
  }
  const md = /\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)/g;
  while ((m = md.exec(text))) {
    let u = m[1];
    if (u.startsWith("/")) u = `${base}${u}`;
    links.add(u.split("#")[0]);
  }
  return [...links];
}

function fakeUrgencyHits(html) {
  const text = stripTags(stripChrome(html));
  const hits = [];
  if (/\b\d+\s+(people\s+)?viewing\s+now\b/i.test(text)) hits.push("viewing now");
  if (/\b\d+\s+people\s+viewing\b/i.test(text)) hits.push("people viewing");
  if (/\bonly\s+\d+\s+left\b/i.test(text) && /countdown|hurry|expires?\s+in/i.test(text)) {
    hits.push("urgency+countdown");
  }
  // Hard-coded countdown widgets often ship data attributes
  if (/data-countdown|countdown-timer|viewer-count/i.test(html)) hits.push("countdown/viewer widget");
  return hits;
}

function textBlocks(html) {
  const text = stripTags(stripChrome(html)).toLowerCase();
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 8);
  return sentences;
}

async function loadRedirectSources() {
  const sources = new Set();
  const files = [
    path.join(ROOT, "storecraft-store/lib/deletedUrlRedirects.mjs"),
    path.join(ROOT, "storecraft-store/lib/collectionRedirectMap.mjs"),
    path.join(ROOT, "storecraft-store/next.config.mjs"),
    path.join(ROOT, "storecraft-store/vercel.json"),
  ];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    const re = /source:\s*["'`]([^"'`]+)["'`]/g;
    let m;
    while ((m = re.exec(text))) {
      let s = m[1];
      // Drop Next.js dynamic patterns for exact sitemap match; keep static paths
      if (s.includes(":")) continue;
      if (!s.startsWith("/")) s = `/${s}`;
      sources.add(s.replace(/\/+$/, "") || "/");
    }
  }
  // Also try importing DELETED_URL_REDIRECTS if available
  try {
    const mod = await import(
      pathToFileURL(path.join(ROOT, "storecraft-store/lib/deletedUrlRedirects.mjs")).href
    );
    for (const r of mod.DELETED_URL_REDIRECTS || []) {
      if (r?.source && !String(r.source).includes(":")) {
        sources.add(String(r.source).replace(/\/+$/, "") || "/");
      }
    }
  } catch {
    /* ignore */
  }
  return sources;
}

function want(id) {
  return CHECK_FILTER.size === 0 || CHECK_FILTER.has(id);
}

async function main() {
  console.error(`seo-verify BASE=${BASE} concurrency=${CONCURRENCY}`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  /** @type {Record<string, CheckResult>} */
  const results = {};
  for (let i = 1; i <= 22; i++) results[`C${i}`] = emptyCheck();

  /** Authoritative GBP NAP — C22. */
  let STORE_NAP = null;
  try {
    const napMod = await import(
      pathToFileURL(path.join(ROOT, "storecraft-store/config/store-nap.js")).href
    );
    STORE_NAP = napMod.STORE_NAP;
  } catch (e) {
    if (want("C22")) {
      failCheck(results.C22, `cannot load store-nap.js: ${e.message}`);
    }
  }

  const redirectSources = await loadRedirectSources();
  let sitemapUrls = await collectSitemapUrls(BASE);
  if (PATH_FILTER) {
    sitemapUrls = sitemapUrls.filter((u) => pathOf(u).includes(PATH_FILTER));
  }
  console.error(`sitemap URLs: ${sitemapUrls.length}`);

  // ---- C15 robots ----
  if (want("C15")) {
    const robots = await fetchOnce(`${BASE}/robots.txt`, { redirect: "follow" });
    results.C15.count++;
    if (robots.status !== 200) {
      failCheck(results.C15, `/robots.txt status ${robots.status}`);
    } else {
      const body = robots.body;
      if (!/sitemap:\s*https?:\/\//i.test(body)) {
        failCheck(results.C15, "/robots.txt missing Sitemap: line");
      }
      const disallow = [...body.matchAll(/disallow:\s*(\S+)/gi)].map((m) => m[1]);
      for (const u of sitemapUrls.slice(0, 2000)) {
        const p = pathOf(u);
        for (const d of disallow) {
          if (d === "/") {
            failCheck(results.C15, `Disallow: / blocks all including ${p}`);
            break;
          }
          if (d !== "/" && d.length > 1 && p.startsWith(d.replace(/\/+$/, ""))) {
            failCheck(results.C15, `Disallow ${d} covers sitemap URL ${p}`);
          }
        }
      }
    }
  }

  // ---- C16 discovery files ----
  if (want("C16")) {
    const discovery = [
      "/ai.txt",
      "/llms.txt",
      "/llms-full.txt",
      "/feed/ai-catalog.json",
      "/feed/products.xml",
    ];
    for (const p of discovery) {
      results.C16.count++;
      const r = await fetchOnce(`${BASE}${p}`, { redirect: "manual" });
      if (r.status !== 200) {
        failCheck(results.C16, `${p} → ${r.status}${r.location ? ` ${r.location}` : ""}`);
      }
    }
  }

  // ---- C14 llms.txt links ----
  let llmsBody = "";
  if (want("C14") || want("C16")) {
    const llms = await fetchOnce(`${BASE}/llms.txt`, { redirect: "follow" });
    llmsBody = llms.body || "";
  }
  if (want("C14") && llmsBody) {
    const links = llmsLinks(llmsBody, BASE);
    results.C14.count = links.length;
    const linkResults = await mapPool(links, CONCURRENCY, async (u) => {
      const r = await fetchOnce(u, { redirect: "manual" });
      return { u, status: r.status, location: r.location };
    });
    for (const lr of linkResults) {
      if (lr.status !== 200) {
        failCheck(
          results.C14,
          `${pathOf(lr.u)} → ${lr.status}${lr.location ? ` ${lr.location}` : ""}`
        );
      }
    }
  }

  // ---- Crawl sitemap pages ----
  // C1: redirect:'manual' only — never follow. Any 3xx is a failure.
  // Content checks (C2+) run ONLY on exact status 200 bodies so redirected
  // destinations cannot pollute title uniqueness / length for the source URL.
  const pages = await mapPool(sitemapUrls, CONCURRENCY, async (url) => {
    const head = await fetchOnce(url, { redirect: "manual" });
    return {
      url,
      pathname: pathOf(url),
      status: head.status,
      location: head.location,
      html: head.status === 200 ? head.body : "",
    };
  });

  const titleMap = new Map(); // title -> [paths]
  const productSample = [];

  for (const p of pages) {
    const { pathname, html, status, location } = p;

    // C1 — sitemap URL must be 200 with no redirect
    if (want("C1")) {
      results.C1.count++;
      if (status !== 200) {
        failCheck(
          results.C1,
          `${pathname} → ${status}${location ? ` ${location}` : ""}${status >= 300 && status < 400 ? " (redirect)" : ""}`
        );
      }
    }

    // C17 redirect map
    if (want("C17")) {
      results.C17.count++;
      if (redirectSources.has(pathname)) {
        failCheck(results.C17, `${pathname} listed in repo redirect map`);
      }
    }

    // Content checks only for true 200 responses (no followed redirects)
    if (status !== 200 || !html) continue;

    const title = extractTitle(html);
    const desc = extractMetaDesc(html);
    const canonical = extractCanonical(html);
    const robots = extractRobotsMeta(html);
    const h1n = countH1(html);
    const { parsed: ld, parseErrors } = parseJsonLd(html);
    const wc = visibleWordCount(html);

    // C2
    if (want("C2")) {
      results.C2.count++;
      if (h1n !== 1) failCheck(results.C2, `${pathname} h1 count=${h1n}`);
    }

    // C3 — title present, ≤60 characters (codepoints after entity decode), unique
    if (want("C3")) {
      results.C3.count++;
      const len = charLen(title);
      if (!title) failCheck(results.C3, `${pathname} missing title`);
      else if (len > 60) {
        failCheck(results.C3, `${pathname} title len=${len} (>60) "${title.slice(0, 70)}"`);
      }
      if (title) {
        if (!titleMap.has(title)) titleMap.set(title, []);
        titleMap.get(title).push(pathname);
      }
    }

    // C4
    if (want("C4")) {
      results.C4.count++;
      const dlen = charLen(desc);
      if (!desc) failCheck(results.C4, `${pathname} missing meta description`);
      else if (dlen > 160) {
        failCheck(results.C4, `${pathname} meta description len=${dlen} (>160)`);
      }
    }

    // C5
    if (want("C5")) {
      results.C5.count++;
      if (!canonical) failCheck(results.C5, `${pathname} missing canonical`);
      else if (!sameUrl(canonical, p.url) && !sameUrl(canonical, `${BASE}${pathname}`)) {
        failCheck(results.C5, `${pathname} canonical=${canonical}`);
      }
    }

    // C6
    if (want("C6")) {
      results.C6.count++;
      if (/\bnoindex\b/i.test(robots)) {
        failCheck(results.C6, `${pathname} robots=${robots}`);
      }
    }

    // C7
    if (want("C7")) {
      results.C7.count++;
      if (parseErrors.length) {
        failCheck(results.C7, `${pathname} JSON-LD parse error: ${parseErrors[0]}`);
      }
    }

    // C8 FAQPage visible
    if (want("C8")) {
      if (hasFaqPage(ld)) {
        results.C8.count++;
        const visibleText = stripTags(stripChrome(html));
        const hasHeading = /frequently asked|FAQ/i.test(visibleText);
        const mainN = faqMainEntityCount(ld);
        const visN = visibleFaqQuestionCount(html);
        if (!hasHeading) {
          failCheck(results.C8, `${pathname} FAQPage without visible FAQ heading`);
        } else if (visN < mainN) {
          failCheck(
            results.C8,
            `${pathname} visible FAQ qs=${visN} < mainEntity=${mainN}`
          );
        }
      }
    }

    // C9 / C10 / C11 Product offers
    const offers = productOffers(ld);
    if (offers.length && (want("C9") || want("C10") || want("C11"))) {
      for (const o of offers) {
        if (want("C9")) {
          results.C9.count++;
          const need = [
            "price",
            "priceCurrency",
            "availability",
            "priceValidUntil",
            "shippingDetails",
            "hasMerchantReturnPolicy",
          ];
          const missing = need.filter((k) => o[k] == null);
          if (missing.length) {
            failCheck(results.C9, `${pathname} offers missing ${missing.join(",")}`);
          }
        }
        if (want("C10")) {
          results.C10.count++;
          const pol = o.hasMerchantReturnPolicy;
          if (!pol || pol.returnFees == null) {
            failCheck(results.C10, `${pathname} hasMerchantReturnPolicy.returnFees missing`);
          }
        }
        if (want("C11")) {
          results.C11.count++;
          const ship = o.shippingDetails;
          const rateNode = Array.isArray(ship)
            ? ship[0]?.shippingRate
            : ship?.shippingRate;
          const rate =
            rateNode?.value ?? rateNode?.price ?? rateNode?.amount ?? null;
          const rateNum = rate != null ? Number(rate) : NaN;
          // Prefer explicit machine-readable flags — do NOT infer from FAQ copy
          // that mentions "bulky" generically.
          const flagTrue =
            /data-is-bulky=["']true["']/i.test(html) ||
            /data-shipping-band=["']bulky["']/i.test(html);
          const flagFalse =
            /data-is-bulky=["']false["']/i.test(html) ||
            /data-shipping-band=["']standard["']/i.test(html);
          if (Number.isNaN(rateNum)) {
            failCheck(results.C11, `${pathname} shippingRate missing`);
          } else if (flagTrue && rateNum !== BULKY_SHIP_PKR) {
            failCheck(
              results.C11,
              `${pathname} shippingRate=${rateNum} expected ${BULKY_SHIP_PKR} (bulky)`
            );
          } else if (flagFalse && rateNum !== STANDARD_SHIP_PKR) {
            failCheck(
              results.C11,
              `${pathname} shippingRate=${rateNum} expected ${STANDARD_SHIP_PKR} (standard)`
            );
          } else if (
            !flagTrue &&
            !flagFalse &&
            rateNum !== STANDARD_SHIP_PKR &&
            rateNum !== BULKY_SHIP_PKR
          ) {
            failCheck(
              results.C11,
              `${pathname} shippingRate=${rateNum} not in {${STANDARD_SHIP_PKR},${BULKY_SHIP_PKR}}`
            );
          }
        }
      }
    }

    // C12 AggregateRating / Review only with real reviews
    if (want("C12")) {
      results.C12.count++;
      if (hasAggregateOrReview(ld)) {
        const text = stripTags(stripChrome(html));
        const zeroReview =
          /\b0(\.0)?\s*out of\s*5\b/i.test(text) ||
          /\b0\s+reviews?\b/i.test(text) ||
          /"reviewCount"\s*:\s*"?0"?/.test(JSON.stringify(ld));
        if (zeroReview) {
          failCheck(results.C12, `${pathname} AggregateRating/Review with zero reviews`);
        }
      }
    }

    // C13 cars word count
    if (want("C13") && pathname.startsWith("/cars/") && pathname !== "/cars") {
      results.C13.count++;
      if (wc < 300) {
        failCheck(results.C13, `${pathname} words=${wc} (<300)`);
      }
    }

    // C18 alt text
    if (want("C18")) {
      results.C18.count++;
      const missing = imagesMissingAlt(html);
      if (missing.length) {
        failCheck(results.C18, `${pathname} img missing alt (${missing[0]})`);
      }
    }

    // C20 fake urgency
    if (want("C20")) {
      results.C20.count++;
      const hits = fakeUrgencyHits(html);
      if (hits.length) {
        failCheck(results.C20, `${pathname} ${hits.join(",")}`);
      }
    }

    // C22 — Organization / AutoPartsStore NAP must match Google Business Profile
    if (want("C22") && STORE_NAP) {
      results.C22.count++;
      const orgNodes = [];
      for (const root of ld) {
        for (const node of walkLd(root)) {
          const types = [].concat(node["@type"] || []).map(String);
          if (
            types.includes("AutoPartsStore") ||
            types.includes("Organization") ||
            types.includes("LocalBusiness")
          ) {
            orgNodes.push(node);
          }
        }
      }
      const org =
        orgNodes.find((n) => String(n["@id"] || "").endsWith("#org")) ||
        orgNodes[0];
      if (!org) {
        failCheck(
          results.C22,
          `${pathname} missing Organization/AutoPartsStore JSON-LD`
        );
      } else {
        const addr = org.address || {};
        const geo = org.geo || {};
        const tel = String(org.telephone || "").replace(/\s+/g, "");
        const expectedTel = String(STORE_NAP.shopPhoneE164).replace(/\s+/g, "");
        if (String(addr.streetAddress || "").trim() !== STORE_NAP.streetAddress) {
          failCheck(
            results.C22,
            `${pathname} streetAddress="${addr.streetAddress}" expected "${STORE_NAP.streetAddress}"`
          );
        }
        if (String(addr.postalCode || "").trim() !== STORE_NAP.postalCode) {
          failCheck(
            results.C22,
            `${pathname} postalCode="${addr.postalCode}" expected "${STORE_NAP.postalCode}"`
          );
        }
        if (Number(geo.latitude) !== Number(STORE_NAP.latitude)) {
          failCheck(
            results.C22,
            `${pathname} geo.latitude=${geo.latitude} expected ${STORE_NAP.latitude}`
          );
        }
        if (Number(geo.longitude) !== Number(STORE_NAP.longitude)) {
          failCheck(
            results.C22,
            `${pathname} geo.longitude=${geo.longitude} expected ${STORE_NAP.longitude}`
          );
        }
        if (tel !== expectedTel) {
          failCheck(
            results.C22,
            `${pathname} telephone="${org.telephone}" expected "${STORE_NAP.shopPhoneE164}"`
          );
        }
        const hours = [].concat(org.openingHoursSpecification || []);
        const flatDays = new Set();
        let hoursOk = hours.length > 0;
        for (const h of hours) {
          const opens = String(h?.opens || "").trim();
          const closes = String(h?.closes || "").trim();
          if (opens !== "00:00" || closes !== "23:59") hoursOk = false;
          for (const d of [].concat(h?.dayOfWeek || [])) flatDays.add(String(d));
        }
        const need = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        if (!hoursOk || need.some((d) => !flatDays.has(d))) {
          failCheck(
            results.C22,
            `${pathname} openingHoursSpecification not 00:00–23:59 all 7 days`
          );
        }
      }
    }

    // Collect product pages for C19
    if (
      pathname !== "/" &&
      !pathname.startsWith("/cars") &&
      !pathname.startsWith("/categories") &&
      !pathname.startsWith("/blogs") &&
      !pathname.startsWith("/feed") &&
      !["/contact", "/shipping-policy", "/returns-policy", "/privacy-policy", "/cart", "/checkout", "/account", "/search", "/track-order"].includes(pathname) &&
      offers.length
    ) {
      productSample.push({ pathname, blocks: textBlocks(html) });
    }
  }

  // C3 uniqueness pass
  if (want("C3")) {
    for (const [title, paths] of titleMap) {
      if (paths.length > 1) {
        failCheck(results.C3, `duplicate title "${title.slice(0, 50)}" on ${paths.slice(0, 3).join(", ")}`);
      }
    }
  }

  // C22 sameAs — each URL must return 200 with no redirect (once)
  if (want("C22") && STORE_NAP) {
    const sameAs = Array.isArray(STORE_NAP.sameAs) ? STORE_NAP.sameAs : [];
    for (const url of sameAs) {
      results.C22.count++;
      const head = await fetchOnce(url, { redirect: "manual" });
      if (head.status !== 200) {
        failCheck(
          results.C22,
          `sameAs ${url} → ${head.status}${head.location ? ` → ${head.location}` : ""} (need 200, no redirect)`
        );
      }
    }
  }

  // C21 — every VEHICLE_SLUG_REDIRECTS entry must 3xx to a final 200
  if (want("C21")) {
    let map = [];
    try {
      const mod = await import(
        pathToFileURL(path.join(ROOT, "storecraft-store/lib/vehicleSlugRedirects.mjs")).href
      );
      map = mod.VEHICLE_SLUG_REDIRECTS || [];
    } catch (e) {
      failCheck(results.C21, `cannot load vehicleSlugRedirects: ${e.message}`);
    }
    results.C21.count = map.length;
    for (const row of map) {
      const src = `${BASE}${row.source}`;
      const head = await fetchOnce(src, { redirect: "manual" });
      if (!(head.status >= 300 && head.status < 400)) {
        failCheck(
          results.C21,
          `${row.source} expected 3xx, got ${head.status}`
        );
        continue;
      }
      const destPath = pathOf(
        head.location.startsWith("http")
          ? head.location
          : `${BASE}${head.location.startsWith("/") ? "" : "/"}${head.location}`
      );
      const expected = pathOf(`${BASE}${row.destination}`);
      if (destPath !== expected) {
        failCheck(
          results.C21,
          `${row.source} → ${destPath} (expected ${expected})`
        );
      }
      const finalUrl = head.location.startsWith("http")
        ? head.location
        : `${BASE}${head.location.startsWith("/") ? head.location : `/${head.location}`}`;
      const dest = await fetchOnce(finalUrl, { redirect: "manual" });
      if (dest.status !== 200) {
        failCheck(
          results.C21,
          `${row.source} destination ${expected} → ${dest.status}`
        );
      }
    }
  }

  // C19 boilerplate ratio on up to 20 product pages (prefer the Nov-10 crawled-not-indexed set)
  if (want("C19")) {
    const PRIORITY_C19 = [
      "/hyundai-tucson-premium-metal-key-cover",
      "/toyota-aqua-2012-2021-velvet-dashboard-mat",
      "/toyota-passo-2016-22-velvet-dashboard-mat",
      "/suzuki-cultus-2017-2026-velvet-dashboard-mat",
      "/honda-civic-front-bumper-mustang-drl-2018-2020",
      "/kia-sportage-batman-style-side-mirror-covers",
      "/byd-atto-3-2025-2026-tpe-floor-mats-premium",
      "/haval-h6-2021-present-carbon-door-handle-cover-abs",
      "/toyota-hilux-revo-2016-2021-tpe-floor-mats-premium",
      "/toyota-mark-x-abs-roof-spoiler-2020-2022",
    ];
    const byPath = new Map(productSample.map((p) => [p.pathname, p]));
    const prioritized = [];
    for (const p of PRIORITY_C19) {
      if (byPath.has(p)) prioritized.push(byPath.get(p));
    }
    for (const p of productSample) {
      if (prioritized.length >= 20) break;
      if (!PRIORITY_C19.includes(p.pathname)) prioritized.push(p);
    }
    const sample = prioritized.slice(0, 20);
    results.C19.count = sample.length;
    if (sample.length >= 5) {
      const freq = new Map();
      for (const p of sample) {
        const uniq = new Set(p.blocks);
        for (const b of uniq) freq.set(b, (freq.get(b) || 0) + 1);
      }
      const threshold = Math.ceil(sample.length / 2);
      const shared = [...freq.entries()].filter(([, n]) => n >= threshold).map(([t]) => t);
      for (const p of sample) {
        if (!p.blocks.length) continue;
        const sharedCount = p.blocks.filter((b) => shared.includes(b)).length;
        const ratio = sharedCount / p.blocks.length;
        if (ratio >= 0.25) {
          failCheck(
            results.C19,
            `${p.pathname} shared-boilerplate=${(ratio * 100).toFixed(0)}% (>=25%)`
          );
        }
      }
      results.C19.note = `sample=${sample.length} sharedBlocks=${shared.length}`;
    } else {
      results.C19.note = `sample too small (${sample.length})`;
    }
  }

  // Summarize
  const ids = Object.keys(results).sort(
    (a, b) => Number(a.slice(1)) - Number(b.slice(1))
  );
  let passed = 0;
  let failed = 0;
  for (const id of ids) {
    if (CHECK_FILTER.size && !CHECK_FILTER.has(id)) continue;
    if (results[id].pass) passed++;
    else failed++;
  }

  const report = {
    audit: "2026-11-10",
    generatedAt: new Date().toISOString(),
    base: BASE,
    sitemapUrlCount: sitemapUrls.length,
    filter: { checks: [...CHECK_FILTER], path: PATH_FILTER || null },
    summary: {
      passed,
      failed,
      line: `C1..C22: ${passed} passed, ${failed} failed`,
    },
    checks: results,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(report.summary.line);
  for (const id of ids) {
    if (CHECK_FILTER.size && !CHECK_FILTER.has(id)) continue;
    const c = results[id];
    const mark = c.pass ? "PASS" : "FAIL";
    console.log(
      `${id} ${mark} count=${c.count} failures=${c.failures.length}${c.note ? ` (${c.note})` : ""}`
    );
    if (!c.pass) {
      for (const f of c.failures) console.log(`  - ${f}`);
    }
  }
  console.error(`wrote ${OUT}`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
