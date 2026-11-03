/**
 * HTTP 410 Gone for junk Shopify kitchen/beauty leftovers (SEO Task 3).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DATA = require("../data/seo/legacy-gone.json");

const EXACT = new Set(
  (DATA.exact || []).map((p) =>
    String(p || "")
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "") || "/"
  )
);

const PATTERNS = (DATA.patterns || []).map((p) => String(p).toLowerCase());

/** Reserved storefront prefixes — never 410 via pattern alone. */
const SAFE_PREFIXES = [
  "/categories/",
  "/cars/",
  "/blogs/",
  "/shop",
  "/sale",
  "/account",
  "/checkout",
  "/cart",
  "/api/",
  "/media/",
  "/_next/",
];

export function normalizeGonePath(pathname) {
  return (
    String(pathname || "")
      .trim()
      .toLowerCase()
      .split("?")[0]
      .replace(/\/+$/, "") || "/"
  );
}

export function isExactGonePath(pathname) {
  return EXACT.has(normalizeGonePath(pathname));
}

/**
 * Pattern match for flat junk slugs only (e.g. /wooden-serving-tray).
 * Does not fire on live /categories/* already handled by exact list.
 */
export function matchesGonePattern(pathname) {
  const path = normalizeGonePath(pathname);
  if (path === "/" || path.includes("/")) {
    // Allow /categories/... only when exact; patterns on multi-segment need exact.
    if (SAFE_PREFIXES.some((p) => path === p.replace(/\/+$/, "") || path.startsWith(p))) {
      return false;
    }
  }
  const slug = path.replace(/^\//, "");
  if (!slug || slug.includes("/")) return false;
  return PATTERNS.some((token) => slug.includes(token));
}

/** True when path should return 410 (exact or conservative flat pattern). */
export function isLegacyGonePath(pathname) {
  if (isExactGonePath(pathname)) return true;
  return matchesGonePattern(pathname);
}

export function goneHtmlBody() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/><title>Gone</title></head><body><h1>Gone</h1><p>This product is no longer available.</p><p><a href="/shop">Shop car accessories</a> · <a href="/cars">Shop by car</a></p></body></html>`;
}
