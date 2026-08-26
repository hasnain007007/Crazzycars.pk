/**
 * Category helpers for storefront routes.
 * Catalog categories come from MongoDB (admin → Categories / seed script).
 */
import { aliasedCategorySlug } from "@/lib/categoryHandleAliases";

export function categoryHref(slug) {
  const s = String(slug || "").trim();
  if (!s) return "/categories";
  const canonical = aliasedCategorySlug(s) || s;
  return `/categories/${canonical}`;
}

/** @deprecated Prefer GET /api/categories/tree — kept for legacy header fallbacks. */
export const CRAZZYCARS_CATEGORIES = [];

export function getCategoryBySlug(slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return null;
  return CRAZZYCARS_CATEGORIES.find((c) => c.slug === s) || null;
}

/** Mega-menu columns — empty; live mega-menu uses /api/categories/tree. */
export function getCategoryMegaColumns() {
  return [];
}
