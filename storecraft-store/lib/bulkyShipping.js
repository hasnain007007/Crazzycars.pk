/**
 * Bulky shipping category detection — shared by JSON-LD Offer shippingRate and checkout.
 * Keep aligned with STORE_POLICY.shipping and llms.txt.
 */

/** Explicit bulky category slugs (and common aliases). */
export const BULKY_CATEGORY_SLUGS = new Set([
  "spoilers-diffusers",
  "splitters-side-skirts",
  "body-kits-extensions",
  "floor-mats",
  "dashboard-mats",
]);

/** Name/slug fragments that mark a category (or product) as bulky. */
const BULKY_FRAGMENT_RE =
  /\b(spoiler|splitter|skirt|body[-_\s]?kit|floor[-_\s]?mat|dashboard[-_\s]?mat|side[-_\s]?skirt)\b/i;

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
 * True when product.isBulky or any category / name / slug matches the bulky set.
 * @param {object|null} product
 */
export function productIsBulkyForShipping(product) {
  if (!product || typeof product !== "object") return false;
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
