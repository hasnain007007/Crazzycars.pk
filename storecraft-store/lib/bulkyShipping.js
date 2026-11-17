/**
 * Bulky shipping category detection — shared by JSON-LD Offer shippingRate and checkout.
 * Keep aligned with STORE_POLICY.shipping and llms.txt.
 *
 * Body kits are NOT bulky for the Rs 500 floor — courier is paid by the customer
 * at the receiving shop (see getShippingRate / resolveCartShippingFloor).
 */

import { isBodyKitProduct } from "./codEligibility.js";

/** Explicit bulky category slugs (and common aliases). Body-kit slugs excluded. */
export const BULKY_CATEGORY_SLUGS = new Set([
  "spoilers-diffusers",
  "splitters-side-skirts",
  "floor-mats",
  "dashboard-mats",
]);

/**
 * Name/slug fragments that mark a category (or product) as bulky.
 * Separators / splitters / skirts / mats / spoilers / diffusers → Rs 500 floor.
 * Body kits intentionally omitted (shop-paid freight).
 */
const BULKY_FRAGMENT_RE =
  /\b(spoiler|splitter|separator|diffuser|skirt|side[-_\s]?skirt|floor[-_\s]?mats?|dashboard[-_\s]?mats?|5d[-_\s]?mats?|7d[-_\s]?mats?|9d[-_\s]?mats?|tpe[-_\s]?mats?|mats?)\b/i;

/**
 * @param {object|string|null} category
 * @returns {boolean}
 */
export function categoryLooksBulky(category) {
  if (!category) return false;
  if (typeof category === "string") {
    const s = category.trim().toLowerCase();
    if (!s) return false;
    if (BULKY_CATEGORY_SLUGS.has(s)) return true;
    return BULKY_FRAGMENT_RE.test(s);
  }
  const slug = String(category.slug || "").trim().toLowerCase();
  const name = String(category.name || "").trim();
  if (slug && BULKY_CATEGORY_SLUGS.has(slug)) return true;
  if (BULKY_FRAGMENT_RE.test(slug) || BULKY_FRAGMENT_RE.test(name)) return true;
  // Ancestor chain if populated (parent / ancestors).
  if (category.parent && categoryLooksBulky(category.parent)) return true;
  const ancestors = Array.isArray(category.ancestors) ? category.ancestors : [];
  for (const a of ancestors) {
    if (categoryLooksBulky(a)) return true;
  }
  return false;
}

/**
 * True when product needs the bulky Rs 500 delivery floor (not body kits).
 * Uses isBulky flag, category slug/name, or product name/slug fragments.
 * @param {object|null} product
 */
export function productIsBulkyForShipping(product) {
  if (!product || typeof product !== "object") return false;
  // Body kits: freight settled at the receiving shop — not the bulky floor.
  if (isBodyKitProduct(product)) return false;

  if (product.isBulky === true || product.is_bulky === true) return true;

  const cats = Array.isArray(product.categories) ? product.categories : [];
  for (const c of cats) {
    if (categoryLooksBulky(c)) return true;
  }

  const blob = [product.name, product.slug, product.handle, product.title]
    .filter(Boolean)
    .join(" ");
  if (blob && BULKY_FRAGMENT_RE.test(blob) && !/under[\s-]?body/i.test(blob)) {
    return true;
  }
  return false;
}
