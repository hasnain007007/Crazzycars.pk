/**
 * Cash on Delivery is off for body kits (large / custom-freight parts).
 * "Underbody kit" LED strips are not body kits.
 */

const BODY_KIT_RE = /body[-_\s]?kits?\b/i;
const UNDERBODY_RE = /under[\s-]?body/i;

function textBlob(product) {
  if (!product || typeof product !== "object") return String(product || "");
  return [product.name, product.slug, product.handle, product.title].filter(Boolean).join(" ");
}

export function isBodyKitProduct(product) {
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

