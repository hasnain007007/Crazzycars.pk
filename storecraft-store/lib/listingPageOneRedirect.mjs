/**
 * Listing URLs with ?page=1 duplicate the clean path (GSC alternate/canonical noise).
 * Middleware 308s these to the path without page=1 while keeping other query params.
 */

/**
 * @param {string} pathname lowercased pathname without query
 * @returns {boolean}
 */
export function isListingPathEligibleForPageOneStrip(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/blogs" || p === "/shop" || p === "/cars" || p === "/sale") return true;
  if (p.startsWith("/categories/") && p.slice("/categories/".length).length > 0) return true;
  if (p.startsWith("/cars/") && p.slice("/cars/".length).length > 0) return true;
  return false;
}

/**
 * Dead Shopify / WordPress atom/rss endpoints — prefer 410 over soft 404.
 * Do NOT match live `/feed/products.xml` or `/feed/ai-catalog.json`.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isGoneAtomFeedPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p.startsWith("/feed/")) return false;
  if (p === "/atom" || p === "/rss" || p === "/index.xml") return true;
  if (p.endsWith(".atom") || p.endsWith(".rss")) return true;
  return false;
}
