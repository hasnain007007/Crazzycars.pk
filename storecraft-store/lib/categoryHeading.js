import { stripTrailingBrandSuffix } from "./brand.js";

const ACRONYMS = new Set([
  "LED",
  "RGB",
  "ABS",
  "TPE",
  "DRL",
  "HUD",
  "3D",
  "7D",
  "9D",
  "PU",
  "AC",
  "USB",
  "OEM",
  "JDM",
  "RS",
  "TRD",
  "GLI",
]);

/** Group category names that keep "Accessories" in the H1. */
const GROUP_NAMES = /^(exterior|interior|universal|universal accessories|carbon fiber)$/i;

/**
 * Title-case a category name for H1 fallbacks; preserve known acronyms.
 * @param {string} name
 */
export function titleCaseCategoryName(name) {
  return String(name || "")
    .trim()
    .split(/(\s+|[/&-])/)
    .map((part) => {
      if (!part || /^[\s/&\-]+$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Category H1 preference: admin h1 → override → seoTitle → rule-based fallback.
 * Rule: add " Accessories" only for group names (Exterior/Interior/…);
 * otherwise `${name} in Pakistan`. Car-type names get a "Car " prefix.
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
    return /[a-z]/.test(override) ? override : titleCaseCategoryName(override);
  }

  const seoTitle = stripTrailingBrandSuffix(
    category?.seo?.metaTitle || category?.metaTitle || ""
  );
  if (seoTitle && !/\bprice\s+in\b/i.test(seoTitle)) return seoTitle;

  const rawName = String(category?.name || "Car").trim();
  const name = titleCaseCategoryName(rawName);

  if (/accessories/i.test(name)) {
    return `${name} in Pakistan`;
  }
  if (GROUP_NAMES.test(rawName)) {
    return `Car ${name} Accessories in Pakistan`;
  }
  // Physical car-part categories that read better with a "Car " prefix.
  const wantsCarPrefix =
    /\b(floor\s*mats?|body\s*kits?|spoilers?|splitters?|seat\s*covers?)\b/i.test(rawName) &&
    !/^car\b/i.test(name);
  if (wantsCarPrefix) {
    return `Car ${name} in Pakistan`;
  }
  return `${name} in Pakistan`;
}
