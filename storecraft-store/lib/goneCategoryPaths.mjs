/**
 * S3 (finish-1029): dead non-car legacy category URLs → HTTP 410.
 * Only zero-click URLs. Redirecting fragrance paths are intentionally omitted.
 * Paths with impressions are still 410'd but listed in seo-reports/finish-1029/S3-report.md.
 */

/** @type {readonly string[]} */
export const GONE_NON_CAR_CATEGORY_PATHS = [
  "/categories/fancy-air-fresheners",
  "/categories/kitchen-accessories",
  "/categories/cookware",
  "/categories/storage-containers",
  "/categories/cutlery-gadgets",
  "/categories/dining-serveware",
  "/categories/beauty-bags",
  "/categories/makeup-pouches",
  "/categories/travel-toiletry-bags",
  "/categories/vanity-organizer-bags",
  "/categories/mini-handbags",
  // Empty placeholders with no close live equivalent → 410 (T9 / T10e).
  // Shelves that have a live parent are aliased in legacyHandleMaps instead.
  "/categories/security-gadgets",
  "/categories/back-neck-care",
  "/categories/roof-racks-rails",
];

const GONE = new Set(
  GONE_NON_CAR_CATEGORY_PATHS.map((p) => p.replace(/\/+$/, "").toLowerCase())
);

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isGoneNonCarCategoryPath(pathname) {
  const path =
    String(pathname || "")
      .trim()
      .replace(/\/+$/, "")
      .toLowerCase() || "/";
  return GONE.has(path);
}
