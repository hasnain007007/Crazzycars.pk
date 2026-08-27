/**
 * Crawl a running storefront and report SEO issues.
 *
 * Usage:
 *   node --experimental-strip-types --env-file=storecraft-store/.env.local scripts/seo-healthcheck.ts
 *   SEO_HEALTHCHECK_URL=https://homefy.pk node --experimental-strip-types scripts/seo-healthcheck.ts
 *
 * Exits 0 with warnings printed (CI should use continue-on-error). Exits 1 only on fatal errors.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "storecraft-store/package.json"));

const BASE = (
  process.env.SEO_HEALTHCHECK_URL ||
  process.env.SCHEMA_TEST_URL ||
  process.env.LISTING_TEST_URL ||
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");

const MAX_PAGES = Number(process.env.SEO_HEALTHCHECK_MAX_PAGES || 500);
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

type Issue = { severity: "warn" | "error"; category: string; url: string; detail: string };

type PageAudit = {
  url: string;
  finalUrl: string;
  status: number;
  redirectChain: string[];
  title: string;
  description: string;
  robots: string;
  h1Count: number;
  imagesMissingAlt: number;
  internalLinks: string[];
};

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(s: string) {
  return decodeHtml(String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return BASE;
  }
}

function normalizeInternalHref(href: string, pageUrl: string) {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) {
    return null;
  }
  try {
    const resolved = new URL(raw, pageUrl);
    const baseOrigin = new URL(BASE).origin;
    if (resolved.origin !== baseOrigin) return null;
    resolved.hash = "";
    let path = resolved.pathname.replace(/\/+$/, "") || "/";
    return `${resolved.origin}${path}${resolved.search}`;
  } catch {
    return null;
  }
}

function parseMetaContent(html: string, attr: "name" | "property", key: string) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`,
    "i"
  );
  const m = html.match(re);
  return decodeHtml((m?.[1] || m?.[2] || "").trim());
}

function parseTitle(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(m?.[1] || "");
}

function countH1(html: string) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}

function countImagesMissingAlt(html: string) {
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  let missing = 0;
  for (const tag of tags) {
    if (!/\balt=/i.test(tag)) missing += 1;
  }
  return missing;
}

function extractInternalLinks(html: string, pageUrl: string) {
  const hrefs = html.match(/\bhref=(["'])(.*?)\1/gi) || [];
  const out = new Set<string>();
  for (const token of hrefs) {
    const m = token.match(/\bhref=(["'])(.*?)\1/i);
    const normalized = normalizeInternalHref(m?.[2] || "", pageUrl);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

async function fetchWithRedirects(path: string): Promise<{
  status: number;
  finalUrl: string;
  html: string;
  redirectChain: string[];
}> {
  const start = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const chain: string[] = [start];
  let url = start;
  let hops = 0;

  while (hops < 8) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "seo-healthcheck/1.0" },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = new URL(loc, url).href;
      chain.push(url);
      hops += 1;
      continue;
    }

    const html = res.headers.get("content-type")?.includes("text/html") ? await res.text() : "";
    return { status: res.status, finalUrl: url, html, redirectChain: chain };
  }

  return { status: 0, finalUrl: url, html: "", redirectChain: chain };
}

async function fetchText(path: string) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { Accept: "*/*", "User-Agent": "seo-healthcheck/1.0" } });
  return { url, status: res.status, text: res.ok ? await res.text() : "" };
}

function isIndexableHtmlUrl(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return !/\.(xml|txt|json|css|js|map|png|jpe?g|gif|webp|ico|svg)$/.test(path);
  } catch {
    return false;
  }
}

function parseSitemapLocs(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

async function discoverSitemapUrls(): Promise<string[]> {
  const indexRes = await fetchText("/sitemap.xml");
  if (indexRes.status !== 200 || !indexRes.text.includes("<sitemapindex")) {
    if (indexRes.text.includes("<urlset")) {
      return parseSitemapLocs(indexRes.text).filter(isIndexableHtmlUrl).slice(0, MAX_PAGES);
    }
    return [];
  }

  const childLocs = parseSitemapLocs(indexRes.text);
  const urls = new Set<string>();
  for (const child of childLocs.slice(0, 20)) {
    const childPath = child.replace(BASE, "");
    const childRes = await fetchText(childPath);
    if (childRes.status === 200) {
      for (const loc of parseSitemapLocs(childRes.text)) {
        if (isIndexableHtmlUrl(loc)) urls.add(loc);
      }
    }
  }
  return [...urls].slice(0, MAX_PAGES);
}

async function discoverPathsFromDb(): Promise<string[]> {
  if (!MONGO_URI) return ["/", "/shop", "/categories", "/cars", "/faq"];
  const mongoose = require("mongoose");
  const Product = require(join(ROOT, "storecraft-store/lib/models/Product.model.js")).default;
  const Category = require(join(ROOT, "storecraft-store/lib/models/Category.model.js")).default;
  const Vehicle = require(join(ROOT, "storecraft-store/lib/models/Vehicle.model.js")).default;
  const BlogPost = require(join(ROOT, "storecraft-store/lib/models/BlogPost.model.js")).default;

  await mongoose.connect(MONGO_URI);
  const [product, category, vehicle, blog] = await Promise.all([
    Product.findOne({ status: "active" }).select("slug").lean(),
    Category.findOne({ status: "active" }).select("slug").lean(),
    Vehicle.findOne({ isActive: { $ne: false } }).select("slug").lean(),
    BlogPost.findOne({ status: "published" }).select("slug").lean(),
  ]);
  await mongoose.disconnect();

  const paths = ["/", "/shop", "/categories", "/cars", "/sale", "/blogs", "/faq", "/contact", "/about"];
  if (product?.slug) paths.push(`/${product.slug}`);
  if (category?.slug) paths.push(`/categories/${category.slug}`);
  if (vehicle?.slug) paths.push(`/cars/${vehicle.slug}`);
  if (blog?.slug) paths.push(`/blogs/${blog.slug}`);
  return [...new Set(paths)];
}

function auditPage(fetchResult: Awaited<ReturnType<typeof fetchWithRedirects>>): PageAudit {
  const { html, finalUrl, status, redirectChain } = fetchResult;
  return {
    url: redirectChain[0] || finalUrl,
    finalUrl,
    status,
    redirectChain,
    title: parseTitle(html),
    description: parseMetaContent(html, "name", "description"),
    robots: parseMetaContent(html, "name", "robots"),
    h1Count: countH1(html),
    imagesMissingAlt: countImagesMissingAlt(html),
    internalLinks: extractInternalLinks(html, finalUrl),
  };
}

function collectIssues(pages: PageAudit[], sitemapUrls: Set<string>): Issue[] {
  const issues: Issue[] = [];
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const linked = new Set<string>();

  for (const page of pages) {
    const key = page.finalUrl.replace(/\/+$/, "") || page.finalUrl;
    linked.add(key);

    if (page.status !== 200) {
      issues.push({ severity: "warn", category: "http", url: page.url, detail: `HTTP ${page.status}` });
    }
    if (page.redirectChain.length > 2) {
      issues.push({
        severity: "warn",
        category: "redirect-chain",
        url: page.url,
        detail: page.redirectChain.join(" → "),
      });
    }
    if (!page.title) {
      issues.push({ severity: "warn", category: "title-missing", url: page.finalUrl, detail: "Missing <title>" });
    } else {
      if (page.title.length > 60) {
        issues.push({
          severity: "warn",
          category: "title-length",
          url: page.finalUrl,
          detail: `${page.title.length} chars (>60)`,
        });
      }
      const bucket = titles.get(page.title) || [];
      bucket.push(page.finalUrl);
      titles.set(page.title, bucket);
    }
    if (!page.description) {
      issues.push({
        severity: "warn",
        category: "description-missing",
        url: page.finalUrl,
        detail: "Missing meta description",
      });
    } else {
      if (page.description.length > 155) {
        issues.push({
          severity: "warn",
          category: "description-length",
          url: page.finalUrl,
          detail: `${page.description.length} chars (>155)`,
        });
      }
      const bucket = descriptions.get(page.description) || [];
      bucket.push(page.finalUrl);
      descriptions.set(page.description, bucket);
    }
    if (page.h1Count === 0) {
      issues.push({ severity: "warn", category: "h1-missing", url: page.finalUrl, detail: "No H1" });
    } else if (page.h1Count > 1) {
      issues.push({
        severity: "warn",
        category: "h1-multiple",
        url: page.finalUrl,
        detail: `${page.h1Count} H1 elements`,
      });
    }
    if (page.imagesMissingAlt > 0) {
      issues.push({
        severity: "warn",
        category: "img-alt",
        url: page.finalUrl,
        detail: `${page.imagesMissingAlt} image(s) missing alt`,
      });
    }

    for (const link of page.internalLinks) linked.add(link.replace(/\/+$/, "") || link);
  }

  for (const [title, urls] of titles) {
    if (urls.length > 1) {
      issues.push({
        severity: "warn",
        category: "title-duplicate",
        url: urls[0],
        detail: `Duplicate title "${title}" on ${urls.length} pages`,
      });
    }
  }
  for (const [desc, urls] of descriptions) {
    if (desc && urls.length > 1) {
      issues.push({
        severity: "warn",
        category: "description-duplicate",
        url: urls[0],
        detail: `Duplicate description on ${urls.length} pages`,
      });
    }
  }

  for (const page of pages) {
    for (const href of page.internalLinks) {
      const normalized = href.replace(/\/+$/, "") || href;
      const target = pages.find((p) => (p.finalUrl.replace(/\/+$/, "") || p.finalUrl) === normalized);
      if (target && target.status !== 200) {
        issues.push({
          severity: "warn",
          category: "broken-link",
          url: page.finalUrl,
          detail: `Broken internal link → ${href} (${target.status})`,
        });
      }
    }
  }

  for (const loc of sitemapUrls) {
    const normalized = loc.replace(/\/+$/, "") || loc;
    if (!linked.has(normalized)) {
      issues.push({
        severity: "warn",
        category: "orphan-sitemap",
        url: loc,
        detail: "In sitemap but not linked from crawled pages",
      });
    }
  }

  return issues;
}

async function main() {
  console.log(`SEO healthcheck → ${BASE}`);

  let sitemapUrls: string[] = [];
  try {
    sitemapUrls = await discoverSitemapUrls();
  } catch (err) {
    console.warn("Sitemap discovery failed:", (err as Error).message);
  }

  let paths: string[];
  if (sitemapUrls.length) {
    paths = sitemapUrls.map((u) => u.replace(originOf(u), "") || "/");
  } else {
    paths = await discoverPathsFromDb();
  }

  paths = [...new Set(paths)].slice(0, MAX_PAGES);
  if (!paths.length) {
    console.error("No URLs to crawl.");
    process.exit(1);
  }

  const pages: PageAudit[] = [];
  for (const path of paths) {
    try {
      const fetched = await fetchWithRedirects(path);
      pages.push(auditPage(fetched));
    } catch (err) {
      pages.push({
        url: `${BASE}${path}`,
        finalUrl: `${BASE}${path}`,
        status: 0,
        redirectChain: [`${BASE}${path}`],
        title: "",
        description: "",
        robots: "",
        h1Count: 0,
        imagesMissingAlt: 0,
        internalLinks: [],
      });
      console.warn(`Fetch failed ${path}:`, (err as Error).message);
    }
  }

  const sitemapSet = new Set(sitemapUrls.map((u) => u.replace(/\/+$/, "") || u));
  const issues = collectIssues(pages, sitemapSet);

  const byCategory = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byCategory.get(issue.category) || [];
    list.push(issue);
    byCategory.set(issue.category, list);
  }

  console.log(`\nCrawled ${pages.length} page(s). ${issues.length} warning(s).\n`);
  for (const [category, list] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`## ${category} (${list.length})`);
    for (const item of list.slice(0, 25)) {
      console.log(`- ${item.url}\n  ${item.detail}`);
    }
    if (list.length > 25) console.log(`  … and ${list.length - 25} more`);
    console.log("");
  }

  if (issues.length) {
    console.log("SEO healthcheck finished with warnings (non-blocking).");
  } else {
    console.log("SEO healthcheck passed with no warnings.");
  }
}

main().catch((err) => {
  console.error("SEO healthcheck fatal error:", err);
  process.exit(1);
});
