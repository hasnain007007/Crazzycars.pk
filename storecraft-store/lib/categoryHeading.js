/**
 * Title-case a category name for H1 fallbacks (never ALL CAPS in the H1 text).
 * Keeps known acronyms (LED) uppercased.
 * @param {string} name
 */
export function titleCaseCategoryName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-/&])([a-z])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`)
    .replace(/\bLed\b/g, "LED")
    .replace(/\bAbs\b/g, "ABS")
    .replace(/\bRgb\b/g, "RGB")
    .replace(/\bHud\b/g, "HUD")
    .replace(/\bUsb\b/g, "USB");
}

/**
 * Category H1 preference: admin h1 → `${Title-cased name} Price in Pakistan`.
 *
 * @param {object} category
 * @param {string} [h1Override] from CATEGORY_H1_OVERRIDES
 */
export function resolveCategoryH1(category, h1Override = "") {
  const adminH1 = String(
    category?.h1 || category?.seo?.h1 || category?.heading || ""
  ).trim();
  if (adminH1) return adminH1.replace(/\bLed\b/g, "LED");

  const override = String(h1Override || "").trim();
  if (override) {
    const text = /[a-z]/.test(override) ? override : titleCaseCategoryName(override);
    return text.replace(/\bLed\b/g, "LED");
  }

  const name = titleCaseCategoryName(category?.name || "Car Accessories");
  if (/\bprice\s+in\s+pakistan\b/i.test(name)) return name;
  return `${name} Price in Pakistan`;
}
