import { REDIRECTED_PRODUCT_SLUGS } from "@/lib/deletedUrlRedirects.mjs";

/**
 * Storefront visibility filter — active and not on security hold.
 * Use wherever listings/PDPs query sellable products.
 */
export const STOREFRONT_PRODUCT_FILTER = {
  status: "active",
  securityHold: { $ne: true },
};

/**
 * Website = the car store. Bike products (segment "bike") live in the app's Bikes store until the
 * website gets its own /bikes section. Apply to website listing, search, feeds and sitemaps only —
 * not to product detail, cart or checkout, which must still resolve bike products for the app.
 * Also hide flat slugs that permanently redirect (DELETED_URL_REDIRECTS) so listings never link to 308s.
 */
export const WEBSITE_SEGMENT_FILTER = { segment: { $in: ["car", null] } };
export const WEBSITE_PRODUCT_FILTER = {
  ...STOREFRONT_PRODUCT_FILTER,
  ...WEBSITE_SEGMENT_FILTER,
  slug: { $nin: REDIRECTED_PRODUCT_SLUGS },
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
