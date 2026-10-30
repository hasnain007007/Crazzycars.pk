/**
 * Cash on Delivery eligibility.
 * Field: `codEligible` (preferred) with legacy alias `codEnabled`.
 * Body kits are always prepaid regardless of the flag.
 */

import { PREPAID_LINE } from "@/lib/paymentCopy";

const BODY_KIT_RE = /body[-_\s]?kits?\b/i;
const UNDERBODY_RE = /under[\s-]?body/i;
const BODY_KIT_CATEGORY_SLUGS = new Set(["body-kits-extensions", "body-kits", "body-kit"]);

function textBlob(product) {
  if (!product || typeof product !== "object") return String(product || "");
  return [product.name, product.slug, product.handle, product.title].filter(Boolean).join(" ");
}

export function isBodyKitProduct(product) {
  const text = textBlob(product);
  if (!text) return false;
  if (UNDERBODY_RE.test(text)) return false;
  if (BODY_KIT_RE.test(text)) return true;

  const cats = Array.isArray(product.categories) ? product.categories : [];
  for (const c of cats) {
    const slug = String(c?.slug || c || "").toLowerCase();
    if (BODY_KIT_CATEGORY_SLUGS.has(slug)) return true;
  }
  // Deal / combo body-kit bundles often tagged isDeal + body kit in name (covered by RE).
  return false;
}

/**
 * True when the storefront may offer COD for this product.
 * Explicit `codEligible: false` (or legacy `codEnabled: false`) always wins.
 * Body kits are never COD.
 */
export function productAllowsCod(product) {
  if (!product || typeof product !== "object") return true;
  if (product.codEligible === false) return false;
  if (product.codEnabled === false) return false;
  if (isBodyKitProduct(product)) return false;
  return true;
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
  return `${PREPAID_LINE}. Cash on Delivery is not available for: ${names}${more}. Choose JazzCash or bank transfer instead.`;
}
