/**
 * Keep in sync with storecraft-store/lib/codEligibility.js
 * (admin and store Coolify apps do not share a package).
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

export function productAllowsCod(product) {
  if (isBodyKitProduct(product)) return false;
  if (!product || typeof product !== "object") return true;
  return product.codEnabled !== false;
}
