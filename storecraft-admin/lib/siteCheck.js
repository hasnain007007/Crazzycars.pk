/**
 * Website check (Admin › Website Check). Read-only: fetches the public store and reads the
 * catalogue, never writes. The admin page runs it in small parts so no request runs long
 * enough to hit a proxy timeout:
 *   plan → pages (batches) → images (batches) → catalog → functions
 */

export function storeBaseUrl() {
  return String(
    process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.STORE_URL || "https://crazzycars.pk"
  ).replace(/\/+$/, "");
}

/** Pages every check visits, besides the sitemap. */
export const KEY_PATHS = [
  "/",
  "/shop",
  "/checkout",
  "/track-order",
  "/account/login",
  "/account/register",
  "/wishlist",
  "/sale",
  "/cars",
  "/blogs",
  "/contact",
  "/faq",
  "/cash-on-delivery",
  "/advance-payment",
];

const UA = "CrazzyCars-Website-Check/1.0";

export function sitemapLocs(xml) {
  return [...String(xml || "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/** All page URLs from sitemap.xml (follows a sitemap index one level). */
export async function sitemapUrls(base = storeBaseUrl()) {
  const res = await fetch(`${base}/sitemap.xml`, { headers: { "user-agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const first = sitemapLocs(await res.text());
  const children = first.filter((u) => /\.xml(\?|$)/.test(u));
  if (!children.length) return first;
  const out = [];
  for (const child of children) {
    const r = await fetch(child, { headers: { "user-agent": UA }, cache: "no-store" });
    if (r.ok) out.push(...sitemapLocs(await r.text()));
  }
  return [...new Set(out)];
}

/** Text a shopper would see (scripts, styles and tags removed). */
export function visibleText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Problems found in one page's HTML. `inSitemap` pages must be indexable.
 * @returns {{ level: "error" | "warn", check: string, detail: string }[]}
 */
export function analysePageHtml(html, { inSitemap = false } = {}) {
  const issues = [];
  const add = (level, check, detail) => issues.push({ level, check, detail });
  const text = visibleText(html);
  const title = (String(html).match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  if (!title.trim()) add("warn", "No page title", "The page has no <title>.");
  const h1 = (String(html).match(/<h1[\s>]/gi) || []).length;
  if (inSitemap && h1 !== 1) add("warn", "Heading", `${h1} main headings (<h1>); Google expects 1.`);
  const robots = (String(html).match(/<meta name="robots" content="([^"]*)"/i) || [])[1] || "";
  if (inSitemap && /noindex/i.test(robots)) add("error", "Hidden from Google", "Listed in the sitemap but marked noindex.");
  const placeholder = text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/);
  if (placeholder) add("error", "Unfilled placeholder", `Shows "${placeholder[0]}" to shoppers.`);
  const junk = text.match(/\b(NaN|undefined|\[object Object\])\b|Rs\.?\s*NaN/);
  if (junk) add("error", "Broken value", `Shows "${junk[0]}" to shoppers.`);
  if (/Application error|Internal Server Error|This page could not be found/i.test(text) && inSitemap) {
    add("error", "Error page", "The page shows an error message.");
  }
  return issues;
}

/** Fetch one page and report problems. */
export async function checkPage(url, { inSitemap = false, timeoutMs = 20000 } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    const issues = [];
    if (res.status !== 200) {
      issues.push({ level: "error", check: "Page not loading", detail: `HTTP ${res.status}` });
      return { url, status: res.status, ms, issues };
    }
    const html = await res.text();
    issues.push(...analysePageHtml(html, { inSitemap }));
    if (ms > 8000) issues.push({ level: "warn", check: "Slow page", detail: `Took ${(ms / 1000).toFixed(1)} s to load.` });
    return { url, status: 200, ms, issues };
  } catch (e) {
    return {
      url,
      status: 0,
      ms: Date.now() - started,
      issues: [{ level: "error", check: "Page not loading", detail: String(e?.message || e).slice(0, 120) }],
    };
  }
}

/** True when an image URL answers 200 with an image. */
export async function imageOk(url, timeoutMs = 15000) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "user-agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok && /^image\//.test(res.headers.get("content-type") || "image/");
  } catch {
    return false;
  }
}

export function absoluteMediaUrl(url, base = storeBaseUrl()) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** Run `fn` over `items` with at most `n` at a time. */
export async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Catalogue problems from product documents (no network). */
export function analyseProducts(products) {
  const issues = [];
  const add = (level, check, p, detail) =>
    issues.push({
      level,
      check,
      detail,
      sku: p.articleNo || "",
      name: p.name || "",
      productId: String(p._id || ""),
      status: p.status || "",
    });
  for (const p of products) {
    const active = /^active$/i.test(String(p.status || ""));
    const imgs = Array.isArray(p.media?.images) ? p.media.images.filter((i) => i?.url) : [];
    const sale = num(p.pricing?.salePrice);
    const regular = num(p.pricing?.regularPrice);
    const price = sale ?? regular ?? num(p.pricing?.price);
    if (active && !imgs.length) add("error", "Live product without photo", p, "Shows “Photo coming soon”.");
    if (!active && /^draft$/i.test(String(p.status || ""))) {
      add("warn", "Draft (not on sale)", p, imgs.length ? `${imgs.length} photo(s) — check them, then activate.` : "No photo yet.");
    }
    if (active && (!price || price <= 0)) add("error", "No price", p, "Price is missing or 0.");
    if (active && sale != null && regular != null && regular > 0 && sale > regular) {
      add("error", "Sale price above regular price", p, `Sale Rs ${sale} > regular Rs ${regular}.`);
    }
    if (active && !(p.categories || []).length) add("warn", "No category", p, "Not listed in any category.");
    const stock = num(p.inventory?.quantity ?? p.inventory?.stock);
    if (active && p.inventory?.trackInventory && stock != null && stock <= 0 && !p.inventory?.allowBackorder) {
      add("warn", "Out of stock", p, "Live but stock is 0, so it cannot be ordered.");
    }
  }
  return issues;
}
