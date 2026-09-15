/**
 * Storefront visibility filter — active and not on security hold.
 * Use wherever listings/PDPs query sellable products.
 */
export const STOREFRONT_PRODUCT_FILTER = {
  status: "active",
  securityHold: { $ne: true },
};

/** Merge hold exclusion into an existing product filter object. */
export function excludeSecurityHeld(filter = {}) {
  return { ...filter, securityHold: { $ne: true } };
}

export function isStorefrontVisibleProduct(product) {
  if (!product) return false;
  if (String(product.status || "").toLowerCase() !== "active") return false;
  if (product.securityHold === true) return false;
  return true;
}
