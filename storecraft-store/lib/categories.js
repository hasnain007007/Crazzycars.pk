/**
 * Category helpers for storefront routes.
 * Catalog categories come from MongoDB (admin → Categories), not this file.
 * Keep this list empty so the store starts clean until you add categories in admin.
 */
export const CRAZZYCARS_CATEGORIES = [];

export function categoryHref(slug) {
  const s = String(slug || "").trim();
  if (!s) return "/categories";
  return `/categories/${s}`;
}

export function getCategoryBySlug(slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return null;
  return CRAZZYCARS_CATEGORIES.find((c) => c.slug === s) || null;
}

/** Mega-menu columns — empty until you configure categories in admin / settings. */
export function getCategoryMegaColumns() {
  return [];
}
