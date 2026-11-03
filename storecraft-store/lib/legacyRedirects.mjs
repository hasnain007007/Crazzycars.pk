/**
 * Exact-path legacy Shopify redirect map (SEO Task 2).
 * Source of truth: data/seo/legacy-redirects.json
 * Review-only rows (enabled:false): data/seo/legacy-redirects-review.json
 *
 * Edge-safe: static JSON import only (no node:module / createRequire).
 */
import ROWS from "../data/seo/legacy-redirects.json" with { type: "json" };

/** @type {Map<string, string>} */
const BY_FROM = new Map();
for (const row of ROWS) {
  const from = normalizePath(row.from);
  const to = normalizePath(row.to);
  if (!from || !to || from === to) continue;
  BY_FROM.set(from, to);
}

export function normalizePath(pathname) {
  const raw = String(pathname || "")
    .trim()
    .toLowerCase()
    .split("?")[0]
    .split("#")[0];
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  return trimmed;
}

/** Enabled exact map rows (for tests / scripts). */
export function getLegacyRedirectRows() {
  return ROWS.map((r) => ({
    from: normalizePath(r.from),
    to: normalizePath(r.to),
    confidence: r.confidence || "exact",
    note: r.note || "",
  }));
}

/**
 * Exact lookup only — does not strip brand suffixes or fuzzy-match.
 * @param {string} pathname
 * @returns {string|null} absolute path or null
 */
export function resolveLegacyRedirect(pathname) {
  const key = normalizePath(pathname);
  return BY_FROM.get(key) || null;
}
