/**
 * Cash on Delivery is off for body kits (large / custom-freight parts).
 * Body kits = products in the body-kits category (or aliases) OR titles/slugs
 * containing "body kit". "Underbody kit" LED strips are not body kits.
 */

/** Category slugs treated as body kits (prepaid only). */
export const BODY_KIT_CATEGORY_SLUGS = Object.freeze([
  "body-kits-extensions",
  "body-kits",
  "body-kit",
]);

const BODY_KIT_RE = /body[-_\s]?kits?\b/i;
const UNDERBODY_RE = /under[\s-]?body/i;

function textBlob(product) {
  if (!product || typeof product !== "object") return String(product || "");
  return [product.name, product.slug, product.handle, product.title, product.productType]
    .filter(Boolean)
    .join(" ");
}

function categorySlugList(product) {
  if (!product || typeof product !== "object") return [];
  const out = [];
  const push = (raw) => {
    const s = String(raw || "")
      .trim()
      .toLowerCase();
    if (s) out.push(s);
  };
  if (Array.isArray(product.categorySlugs)) {
    for (const s of product.categorySlugs) push(s);
  }
  if (product.categorySlug) push(product.categorySlug);
  if (typeof product.category === "string") push(product.category);
  else if (product.category && typeof product.category === "object") {
    push(product.category.slug);
  }
  if (Array.isArray(product.categories)) {
    for (const c of product.categories) {
      if (typeof c === "string" && !/^[a-f0-9]{24}$/i.test(c)) push(c);
      else if (c && typeof c === "object") push(c.slug);
    }
  }
  return out;
}

export function isBodyKitProduct(product) {
  if (!product) return false;
  const slugs = categorySlugList(product);
  if (slugs.some((s) => BODY_KIT_CATEGORY_SLUGS.includes(s))) return true;

  const text = textBlob(product);
  if (!text) return false;
  if (UNDERBODY_RE.test(text)) return false;
  return BODY_KIT_RE.test(text);
}

/** False when the merchant turned COD off, or the product is a body kit. */
export function productAllowsCod(product) {
  if (isBodyKitProduct(product)) return false;
  if (!product || typeof product !== "object") return true;
  return product.codEnabled !== false;
}

/**
 * Exact storefront message when COD is blocked for one or more cart products.
 * Keep in sync with checkout / mobile cart quote (characterization-tested).
 */
export function buildCodUnavailableMessage(blockedProducts) {
  const blocked = Array.isArray(blockedProducts) ? blockedProducts.filter(Boolean) : [];
  const names = blocked
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");
  const more = blocked.length > 3 ? ` (+${blocked.length - 3} more)` : "";
  return `Cash on Delivery is not available for: ${names}${more}. Choose advance payment instead.`;
}
