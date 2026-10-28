#!/usr/bin/env node
/**
 * SEO / AEO / GEO verifier (audit 2026-10-27).
 *
 *   BASE_URL=https://crazzycars.pk node scripts/seo-verify.mjs
 *   BASE_URL=https://crazzycars.pk OUT=seo-reports/baseline.json node scripts/seo-verify.mjs
 *
 * Exits non-zero if any HARD check fails.
 * Concurrency capped at 4. Never prints env secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const OUT =
  process.env.OUT ||
  path.join(ROOT, "seo-reports", `run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const CONCURRENCY = Math.min(4, Number(process.env.SEO_VERIFY_CONCURRENCY) || 4);
const UA = "CrazzyCars-seo-verify/2026-10-27 (+https://crazzycars.pk)";
const FETCH_TIMEOUT_MS = Number(process.env.SEO_VERIFY_TIMEOUT_MS) || 25000;

/** @typedef {{ pass: boolean, count: number, failures: string[], soft?: boolean, note?: string, kb?: number }} CheckResult */

function emptyCheck(soft = false) {
  return /** @type {CheckResult} */ ({ pass: true, count: 0, failures: [], soft });
}

function failCheck(check, msg, soft = false) {
  check.pass = false;
  check.failures.push(msg);
  if (soft) check.soft = true;
}

async function fetchOnce(url, { redirect = "follow", method = "GET" } = {}) {
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
      headers: res.headers,
    };
  } catch (err) {
    const msg = String(err?.message || err || "");
    return {
      status: 0,
      location: "",
      body: "",
      bytes: 0,
      headers: new Headers(),
      error: msg.includes("abort") ? "timeout" : msg.slice(0, 120),
    };
  } finally {
    clearTimeout(t);
  }
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
  const root = await fetchOnce(`${base}/sitemap.xml`);
  if (root.status !== 200) {
    throw new Error(`sitemap.xml status ${root.status}`);
  }
  const locs = locTags(root.body);
  const urls = new Set();
  const submaps = locs.filter((u) => /\.xml(\?|$)/i.test(u) || /sitemap/i.test(u));
  const pages = locs.filter((u) => !submaps.includes(u));
  for (const u of pages) urls.add(u.split("#")[0]);

  const subBodies = await mapPool(submaps, CONCURRENCY, async (sm) => {
    const r = await fetchOnce(sm);
    return { sm, status: r.status, locs: r.status === 200 ? locTags(r.body) : [] };
  });
  for (const s of subBodies) {
    if (s.status !== 200) continue;
    for (const u of s.locs) urls.add(u.split("#")[0]);
  }
  return { urls: [...urls].sort(), submaps: subBodies };
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCanonical(html) {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1].trim() : "";
}
function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}
function extractMetaDesc(html) {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
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
function hasOgImage(html) {
  return /property=["']og:image["']/i.test(html) || /name=["']og:image["']/i.test(html);
}
function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore bad ld+json */
    }
  }
  return blocks;
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
function faqQuestionsFromLd(blocks) {
  const qs = [];
  for (const root of blocks) {
    for (const n of walkLd(root)) {
      const types = [].concat(n["@type"] || []).map(String);
      if (!types.includes("FAQPage")) continue;
      const entities = [].concat(n.mainEntity || []);
      for (const q of entities) {
        const name = String(q?.name || q?.question || "").trim();
        if (name) qs.push(name);
      }
    }
  }
  return qs;
}
function normQ(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function paragraphAfterH1(html) {
  const m = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*([\s\S]{0,2500})/i);
  if (!m) return "";
  const chunk = m[1];
  const p = chunk.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return p ? stripTags(p[1]) : "";
}
function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
function productOffersHave(blocks, key) {
  for (const root of blocks) {
    for (const n of walkLd(root)) {
      const types = [].concat(n["@type"] || []).map(String);
      if (!types.includes("Product")) continue;
      const offers = [].concat(n.offers || []);
      for (const o of offers) {
        if (o && o[key]) return true;
      }
    }
  }
  return false;
}
function hasType(blocks, typeName) {
  for (const root of blocks) {
    for (const n of walkLd(root)) {
      const types = [].concat(n["@type"] || []).map(String);
      if (types.includes(typeName)) return true;
    }
  }
  return false;
}
function articleAuthorIsPerson(blocks) {
  for (const root of blocks) {
    for (const n of walkLd(root)) {
      const types = [].concat(n["@type"] || []).map(String);
      if (!types.includes("Article") && !types.includes("BlogPosting")) continue;
      const a = n.author;
      if (!a) continue;
      const authors = [].concat(a);
      for (const au of authors) {
        const t = [].concat(au?.["@type"] || []).map(String);
        const name = String(au?.name || "").trim();
        if (t.includes("Person") && name && !/^crazzy\s*cars/i.test(name)) return true;
      }
    }
  }
  return false;
}
function visibleLastUpdated(html) {
  return /last\s+updated/i.test(stripTags(html));
}
function visibleBreadcrumb(html) {
  return (
    /aria-label=["']breadcrumb["']/i.test(html) ||
    /itemtype=["']https?:\/\/schema\.org\/BreadcrumbList["']/i.test(html) ||
    /class=["'][^"']*breadcrumb/i.test(html)
  );
}
function llmsLinks(text, base) {
  const links = [];
  const re = /https?:\/\/[^\s)\]>"']+|\]\((\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    let u = m[1] || m[0];
    if (u.startsWith("/")) u = `${base}${u}`;
    if (!u.startsWith(base) && !u.startsWith("https://crazzycars.pk")) continue;
    links.push(u.replace(/[.,;]+$/, "").split("#")[0]);
  }
  // also markdown [text](https://…)
  const md = /\]\((https?:\/\/[^)\s]+)\)/g;
  while ((m = md.exec(text))) {
    const u = m[1].split("#")[0];
    if (u.startsWith(base) || u.startsWith("https://crazzycars.pk")) links.push(u);
  }
  return [...new Set(links)];
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
function pathOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
}
function sameUrl(a, b) {
  try {
    const A = new URL(a);
    const B = new URL(b);
    const norm = (u) =>
      `${u.origin}${u.pathname.replace(/\/+$/, "") || "/"}${u.search}`;
    return norm(A) === norm(B);
  } catch {
    return a === b;
  }
}

function scanRepoDefaultCreds() {
  const roots = [
    "README.md",
    "docs",
    "storecraft-admin/scripts",
    "storecraft-store/scripts",
    "scripts",
  ];
  const hits = [];
  const patterns = [
    { type: "default-password", re: /password\s*[=:]\s*["']?(admin|password|123456|changeme)/i },
    { type: "default-admin-user", re: /(?:username|email)\s*[=:]\s*["']?admin@/i },
    { type: "hardcoded-admin-email", re: /(?:const|let)\s+ADMIN_EMAIL\s*=\s*["'][^"']+@/i },
    { type: "hardcoded-password-literal", re: /password\s*:\s*["'][^"']{6,}["']/i },
    { type: "first-login-with-email", re: /log\s+in\s+as\s+`?admin@/i },
    { type: "mongodb-default-auth", re: /mongodb:\/\/[^:]+:(password|admin|secret)@/i },
  ];
  function walk(dir, depth = 0) {
    if (depth > 4) return;
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return;
    const st = fs.statSync(full);
    if (st.isFile()) {
      if (!/\.(md|mjs|js|ts|txt|sh)$/i.test(full)) return;
      // Skip this verifier file (patterns documented here)
      if (full.endsWith(`${path.sep}seo-verify.mjs`)) return;
      let text = "";
      try {
        text = fs.readFileSync(full, "utf8");
      } catch {
        return;
      }
      const lines = text.split(/\n/);
      lines.forEach((line, i) => {
        for (const p of patterns) {
          if (p.re.test(line)) hits.push(`${dir}:${i + 1}:${p.type}`);
        }
      });
      return;
    }
    for (const name of fs.readdirSync(full)) {
      if (name === "node_modules" || name === ".git" || name === ".next") continue;
      walk(path.join(dir, name), depth + 1);
    }
  }
  for (const r of roots) walk(r);
  return hits;
}

async function main() {
  console.error(`seo-verify BASE=${BASE} concurrency=${CONCURRENCY}`);

  /** @type {Record<string, CheckResult>} */
  const results = {
    C1: emptyCheck(),
    C2: emptyCheck(),
    C3: emptyCheck(),
    C4: emptyCheck(),
    C5: emptyCheck(),
    C6: emptyCheck(),
    C7: emptyCheck(),
    C8: emptyCheck(true),
    C9: emptyCheck(),
    C10: emptyCheck(),
    C11: emptyCheck(),
    C12: emptyCheck(),
    C13: emptyCheck(),
    C14: emptyCheck(),
    C15: emptyCheck(),
    C16: emptyCheck(),
    C17: emptyCheck(),
    C18: emptyCheck(),
    C19: emptyCheck(true),
    C20: emptyCheck(true),
    C21: emptyCheck(),
    C22: emptyCheck(),
    C24: emptyCheck(true),
  };

  const { urls: sitemapUrls } = await collectSitemapUrls(BASE);
  console.error(`sitemap urls: ${sitemapUrls.length}`);

  // Fetch sitemap pages (manual redirect to detect C1/C16)
  const pageFetches = await mapPool(sitemapUrls, CONCURRENCY, async (url) => {
    const head = await fetchOnce(url, { redirect: "manual" });
    if ([301, 302, 307, 308].includes(head.status)) {
      return { url, status: head.status, location: head.location, body: "", redirected: true };
    }
    if (head.status !== 200) {
      return { url, status: head.status, location: "", body: "", redirected: false };
    }
    // Need body for HTML checks — follow once if somehow empty
    const full = head.body
      ? head
      : await fetchOnce(url, { redirect: "follow" });
    return {
      url,
      status: full.status,
      location: "",
      body: full.body,
      bytes: full.bytes,
      redirected: false,
    };
  });

  const titleMap = new Map();
  const descMap = new Map();
  let imgMissing = 0;
  let imgTotal = 0;

  for (const p of pageFetches) {
    results.C1.count++;
    results.C16.count++;
    if (p.redirected || p.status !== 200) {
      failCheck(results.C1, `${pathOf(p.url)} → ${p.status}${p.location ? ` ${p.location}` : ""}`);
      if (p.redirected) {
        failCheck(results.C16, `${pathOf(p.url)} redirects ${p.status} → ${p.location}`);
      }
      continue;
    }

    const html = p.body || "";
    const pathname = pathOf(p.url);

    // C2
    results.C2.count++;
    const robots = extractRobotsMeta(html);
    if (/\bnoindex\b/.test(robots)) failCheck(results.C2, `${pathname} noindex`);
    const canon = extractCanonical(html);
    if (!canon) failCheck(results.C2, `${pathname} missing canonical`);
    else if (!sameUrl(canon, p.url)) failCheck(results.C2, `${pathname} canonical ${canon}`);

    // C3
    results.C3.count++;
    const h1n = countH1(html);
    if (h1n !== 1) failCheck(results.C3, `${pathname} h1 count ${h1n}`);

    // C4 / C5
    const title = extractTitle(html);
    const desc = extractMetaDesc(html);
    results.C4.count++;
    results.C5.count++;
    if (!title) failCheck(results.C4, `${pathname} missing title`);
    else if ([...title].length > 60) failCheck(results.C4, `${pathname} title ${[...title].length} chars`);
    if (!desc) failCheck(results.C5, `${pathname} missing description`);
    else if ([...desc].length > 160)
      failCheck(results.C5, `${pathname} description ${[...desc].length} chars`);

    if (title) {
      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title).push(pathname);
    }
    if (desc) {
      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc).push(pathname);
    }

    // C7
    results.C7.count++;
    if (!hasOgImage(html)) failCheck(results.C7, `${pathname} missing og:image`);

    // C8
    const miss = imagesMissingAlt(html);
    const imgs = (html.match(/<img\b/gi) || []).length;
    imgTotal += imgs;
    imgMissing += miss.length;
    for (const src of miss.slice(0, 3)) {
      failCheck(results.C8, `${pathname} img missing alt: ${src}`, true);
    }

    const ld = extractJsonLdBlocks(html);

    // C9 / C10 vehicle
    if (pathname.startsWith("/cars/") && pathname !== "/cars") {
      results.C9.count++;
      results.C10.count++;
      const faqQs = faqQuestionsFromLd(ld);
      const visible = stripTags(html).toLowerCase();
      let visibleFaqHits = 0;
      for (const q of faqQs) {
        if (visible.includes(normQ(q).slice(0, 40)) || visible.includes(q.toLowerCase().slice(0, 40))) {
          visibleFaqHits++;
        } else {
          failCheck(results.C9, `${pathname} FAQ LD not visible: ${q.slice(0, 80)}`);
        }
      }
      // vehicle-specific: questions mentioning make/model-ish words beyond COD/shipping
      const vehicleish = faqQs.filter(
        (q) => !/cash on delivery|delivery charge|return|trusted store|shipping/i.test(q)
      );
      if (vehicleish.length < 4) {
        failCheck(
          results.C9,
          `${pathname} only ${vehicleish.length} vehicle-specific FAQ questions (need ≥4)`
        );
      }
      if (faqQs.length && visibleFaqHits === 0) {
        // already failed per-question
      }

      const para = paragraphAfterH1(html);
      const wc = wordCount(para);
      if (wc < 40 || wc > 60) {
        failCheck(results.C10, `${pathname} direct-answer words=${wc} (need 40–60)`);
      }
    }

    // C11 products (flat PDP: single segment, not reserved)
    const reserved = new Set([
      "",
      "shop",
      "sale",
      "cars",
      "categories",
      "blogs",
      "blog",
      "posts",
      "contact",
      "about",
      "faq",
      "cart",
      "checkout",
      "account",
      "track-order",
      "compare",
      "wishlist",
      "search",
      "collections",
      "pages",
      "products",
      "llms.txt",
      "robots.txt",
      "feed",
      "api",
    ]);
    const segs = pathname.split("/").filter(Boolean);
    const looksProduct =
      segs.length === 1 &&
      !reserved.has(segs[0]) &&
      !segs[0].endsWith(".xml") &&
      !segs[0].endsWith(".txt") &&
      !segs[0].endsWith(".json");
    if (looksProduct && hasType(ld, "Product")) {
      results.C11.count++;
      if (!productOffersHave(ld, "hasMerchantReturnPolicy")) {
        failCheck(results.C11, `${pathname} offers missing hasMerchantReturnPolicy`);
      }
      if (!productOffersHave(ld, "shippingDetails")) {
        failCheck(results.C11, `${pathname} offers missing shippingDetails`);
      }
    }

    // C12 blogs
    if (pathname === "/blogs" || pathname === "/blog") {
      results.C12.count++;
      if (!hasType(ld, "Blog") && !hasType(ld, "CollectionPage")) {
        failCheck(results.C12, `${pathname} missing Blog/CollectionPage JSON-LD`);
      }
    }
    if (pathname.startsWith("/blogs/") || pathname.startsWith("/posts/")) {
      results.C12.count++;
      if (!visibleBreadcrumb(html)) failCheck(results.C12, `${pathname} missing visible breadcrumb`);
      if (!hasType(ld, "BreadcrumbList")) failCheck(results.C12, `${pathname} missing BreadcrumbList`);
      if (!visibleLastUpdated(html)) failCheck(results.C12, `${pathname} missing Last updated`);
      // Author Person skipped until OWNER INPUTS — mark soft note only once
      if (!articleAuthorIsPerson(ld)) {
        results.C12.note = "Author Person check skipped/NEEDS-OWNER (no named author in OWNER INPUTS)";
      }
    }
  }

  results.C8.count = imgTotal;
  if (imgMissing === 0) results.C8.pass = true;
  else {
    results.C8.pass = false;
    results.C8.note = `${imgMissing} images missing alt of ${imgTotal}`;
  }

  // C6 duplicates
  results.C6.count = sitemapUrls.length;
  for (const [t, paths] of titleMap) {
    if (paths.length > 1) failCheck(results.C6, `duplicate title (${paths.length}): ${t.slice(0, 70)} → ${paths.slice(0, 5).join(", ")}`);
  }
  for (const [d, paths] of descMap) {
    if (paths.length > 1) failCheck(results.C6, `duplicate description (${paths.length}): ${d.slice(0, 70)} → ${paths.slice(0, 5).join(", ")}`);
  }

  // C13 llms.txt (+ C22: ≥100 links, none broken/redirecting)
  {
    const llms = await fetchOnce(`${BASE}/llms.txt`);
    results.C13.count++;
    if (llms.status !== 200) {
      failCheck(results.C13, `/llms.txt status ${llms.status}`);
      failCheck(results.C22, `/llms.txt status ${llms.status}`);
    } else {
      const links = llmsLinks(llms.body, BASE);
      results.C13.count = links.length;
      results.C22.count = links.length;
      if (links.length < 100) {
        failCheck(results.C22, `llms.txt has ${links.length} links (need ≥100)`);
      }
      const bytes = Buffer.byteLength(llms.body || "", "utf8");
      if (bytes > 30 * 1024) {
        failCheck(results.C22, `llms.txt ${bytes} bytes > 30 KB`);
      }
      const linkChecks = await mapPool(links, CONCURRENCY, async (u) => {
        const r = await fetchOnce(u, { redirect: "manual" });
        return { u, status: r.status, location: r.location };
      });
      for (const c of linkChecks) {
        if (c.status !== 200) {
          const msg = `${pathOf(c.u)} → ${c.status}${c.location ? ` ${c.location}` : ""}`;
          failCheck(results.C13, msg);
          failCheck(results.C22, msg);
        }
      }
    }
  }

  // C14 robots.txt
  {
    const robots = await fetchOnce(`${BASE}/robots.txt`);
    results.C14.count++;
    if (robots.status !== 200) {
      failCheck(results.C14, `robots.txt status ${robots.status}`);
    } else {
      const text = robots.body;
      const aiAgents = [
        "GPTBot",
        "ChatGPT-User",
        "ClaudeBot",
        "PerplexityBot",
        "Google-Extended",
        "Bytespider",
        "CCBot",
        "anthropic-ai",
      ];
      for (const ua of aiAgents) {
        const block = text.split(/(?=User-agent:\s*)/i).find((b) => new RegExp(`User-agent:\\s*${ua}\\b`, "i").test(b));
        if (block && /Disallow:\s*\//i.test(block) && !/Disallow:\s*\/\s*$/m.test(block) === false) {
          // Only fail if that UA block disallows entire site
          if (/Disallow:\s*\/\s*$/m.test(block) && !/Allow:\s*\//i.test(block)) {
            failCheck(results.C14, `robots Disallow / for ${ua}`);
          }
        }
      }
      // Allow lines that 404 (except /feed/) — unique concrete paths only (no wildcards)
      // Match only real Allow: lines — /Allow:/gi also hits the suffix of Disallow:
      const allows = [
        ...new Set([...text.matchAll(/(?:^|\n)Allow:\s*(\S+)/gi)].map((m) => m[1])),
      ];
      for (const a of allows) {
        if (a === "/" || a.startsWith("/feed") || /[*?]/.test(a)) continue;
        if (!/^\/[A-Za-z0-9._/-]+$/.test(a)) continue;
        const candidates = [a];
        if (a.endsWith("/") && a !== "/") candidates.push(a.slice(0, -1));
        if (a === "/.well-known" || a === "/.well-known/") {
          candidates.push("/.well-known/ai.json", "/.well-known/security.txt");
        }
        let okPath = false;
        for (const pathTry of candidates) {
          const url = `${BASE}${pathTry}`;
          const r = await fetchOnce(url, { redirect: "manual" });
          let finalStatus = r.status;
          if ([301, 302, 307, 308].includes(r.status) && r.location) {
            const loc = r.location.startsWith("http") ? r.location : `${BASE}${r.location}`;
            finalStatus = (await fetchOnce(loc, { redirect: "follow" })).status;
          }
          if (finalStatus === 200) {
            okPath = true;
            break;
          }
        }
        if (!okPath) failCheck(results.C14, `robots Allow ${a} → 404`);
      }
    }
  }

  // C15 redirect map
  {
    const mapPath = path.join(ROOT, "seo-reports", "redirect-map.csv");
    if (!fs.existsSync(mapPath)) {
      results.C15.pass = false;
      results.C15.count = 0;
      results.C15.failures.push("seo-reports/redirect-map.csv not built");
      results.C15.note = "Create redirect-map.csv then re-run";
    } else {
      const rows = fs
        .readFileSync(mapPath, "utf8")
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !/^old[,;]/i.test(l));
      results.C15.count = rows.length;
      await mapPool(rows, CONCURRENCY, async (row) => {
        const [oldPath, expect] = row.split(/[,;\t]/).map((s) => s.trim());
        if (!oldPath || !expect) return;
        const url = oldPath.startsWith("http") ? oldPath : `${BASE}${oldPath.startsWith("/") ? oldPath : `/${oldPath}`}`;
        const r = await fetchOnce(url, { redirect: "manual" });
        if (![301, 308].includes(r.status)) {
          failCheck(results.C15, `${oldPath} expected 301/308 got ${r.status}`);
          return;
        }
        let loc = r.location || "";
        if (loc.startsWith("/")) loc = `${BASE}${loc}`;
        const expectUrl = expect.startsWith("http") ? expect : `${BASE}${expect.startsWith("/") ? expect : `/${expect}`}`;
        if (!sameUrl(loc, expectUrl)) {
          failCheck(results.C15, `${oldPath} → ${loc} expected ${expectUrl}`);
        }
        // single hop
        const second = await fetchOnce(loc, { redirect: "manual" });
        if ([301, 302, 307, 308].includes(second.status)) {
          failCheck(results.C15, `${oldPath} redirect chain`);
        }
      });
    }
  }

  // C17 feed vs sitemap-products
  {
    const [feed, sm] = await Promise.all([
      fetchOnce(`${BASE}/feed/ai-catalog.json`),
      fetchOnce(`${BASE}/sitemap-products.xml`),
    ]);
    results.C17.count = 2;
    if (feed.status !== 200) failCheck(results.C17, `ai-catalog.json ${feed.status}`);
    if (sm.status !== 200) failCheck(results.C17, `sitemap-products.xml ${sm.status}`);
    if (feed.status === 200 && sm.status === 200) {
      let feedCount = 0;
      try {
        const j = JSON.parse(feed.body);
        const products = j.products || j.items || j;
        feedCount = Array.isArray(products) ? products.length : 0;
      } catch {
        failCheck(results.C17, "ai-catalog.json parse error");
      }
      const smCount = locTags(sm.body).length;
      results.C17.count = feedCount;
      if (feedCount !== smCount) {
        failCheck(results.C17, `feed products ${feedCount} ≠ sitemap-products ${smCount}`);
      }
    }
  }

  // C18 security.txt
  {
    const sec = await fetchOnce(`${BASE}/.well-known/security.txt`);
    results.C18.count++;
    if (sec.status !== 200) failCheck(results.C18, `security.txt status ${sec.status}`);
    else if (!/Contact:\s*mailto:/i.test(sec.body || "")) {
      failCheck(results.C18, "security.txt missing Contact mailto");
    }
  }

  // C21 internal link crawl (scripts/link-check.mjs)
  {
    const { spawnSync } = await import("node:child_process");
    const linkCheckPath = path.join(ROOT, "scripts", "link-check.mjs");
    const run = spawnSync(process.execPath, [linkCheckPath, "--json", "--quiet"], {
      env: { ...process.env, BASE_URL: BASE },
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    let report = null;
    try {
      report = JSON.parse(run.stdout || "{}");
    } catch {
      report = null;
    }
    results.C21.count = Number(report?.checked) || 0;
    if (run.status !== 0 && !report) {
      failCheck(results.C21, `link-check exited ${run.status}: ${(run.stderr || "").slice(0, 200)}`);
    } else {
      for (const f of report?.failures || []) failCheck(results.C21, f);
      if ((report?.failed || 0) > (report?.failures || []).length) {
        failCheck(results.C21, `… +${report.failed - report.failures.length} more`);
      }
    }
  }

  // C24 default-credential text in README / seed / docs (was C21)
  {
    const credHits = scanRepoDefaultCreds();
    results.C24.count = credHits.length || 1;
    for (const h of credHits.slice(0, 40)) failCheck(results.C24, h, true);
  }

  // C19 homepage size
  {
    const home = pageFetches.find((p) => pathOf(p.url) === "/") || (await fetchOnce(`${BASE}/`));
    const kb = Math.round(((home.bytes || Buffer.byteLength(home.body || "", "utf8")) / 1024) * 10) / 10;
    results.C19.count = 1;
    results.C19.kb = kb;
    results.C19.soft = true;
    if (kb > 300) {
      results.C19.pass = false;
      results.C19.failures.push(`homepage ${kb} KB > 300 KB target`);
    }
  }

  // C20 sample 50 internal links
  {
    const sample = pageFetches.filter((p) => p.status === 200 && p.body).slice(0, 50);
    const hrefs = new Set();
    for (const p of sample) {
      const re = /href=["'](\/[^"'#?]+)/gi;
      let m;
      while ((m = re.exec(p.body)) && hrefs.size < 200) {
        const h = m[1];
        if (h.startsWith("/api/") || h.startsWith("/_next/")) continue;
        hrefs.add(h);
      }
    }
    const list = [...hrefs].slice(0, 80);
    results.C20.count = list.length;
    results.C20.soft = true;
    const checks = await mapPool(list, CONCURRENCY, async (h) => {
      const r = await fetchOnce(`${BASE}${h}`, { redirect: "manual" });
      return { h, status: r.status };
    });
    for (const c of checks) {
      if (c.status >= 400) failCheck(results.C20, `${c.h} → ${c.status}`, true);
    }
  }

  // Cap failure lists for readability
  for (const id of Object.keys(results)) {
    const c = results[id];
    if (c.failures.length > 40) {
      const extra = c.failures.length - 40;
      c.failures = c.failures.slice(0, 40);
      c.failures.push(`… +${extra} more`);
    }
  }

  const hardIds = Object.keys(results).filter((id) => !results[id].soft);
  const hardFail = hardIds.filter((id) => !results[id].pass);
  const softFail = Object.keys(results).filter((id) => results[id].soft && !results[id].pass);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    sitemapUrlCount: sitemapUrls.length,
    checks: results,
    hardFailed: hardFail,
    softFailed: softFail,
    ownerInputs: "EMPTY — NEEDS-OWNER for author name and any business facts",
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.error(
    `SUMMARY hard_fail=${hardFail.length ? hardFail.join(",") : "none"} soft_fail=${softFail.length ? softFail.join(",") : "none"} out=${OUT}`
  );
  process.exit(hardFail.length ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err?.message || err);
  process.exit(2);
});
