import { stripTrailingBrandSuffix } from "./brand.js";

/**
 * Title-case a category name for H1 fallbacks (never ALL CAPS in the H1 text).
 * @param {string} name
 */
export function titleCaseCategoryName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-/&])([a-z])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Category H1 preference: admin h1 → seoTitle without brand suffix →
 * `${Title-cased name} Accessories in Pakistan`.
 *
 * @param {object} category
 * @param {string} [h1Override] from CATEGORY_H1_OVERRIDES
 */
export function resolveCategoryH1(category, h1Override = "") {
  const adminH1 = String(
    category?.h1 || category?.seo?.h1 || category?.heading || ""
  ).trim();
  if (adminH1) return adminH1;

  const override = String(h1Override || "").trim();
  if (override) {
    // Overrides may be stored uppercased for visual style — normalise for H1 text.
    return /[a-z]/.test(override) ? override : titleCaseCategoryName(override);
  }

  const seoTitle = stripTrailingBrandSuffix(
    category?.seo?.metaTitle || category?.metaTitle || ""
  );
  if (seoTitle) return seoTitle;

  const name = titleCaseCategoryName(category?.name || "Car");
  // Avoid "Accessories Accessories"
  if (/accessories/i.test(name)) {
    return `${name} in Pakistan`;
  }
  return `${name} Accessories in Pakistan`;
}
