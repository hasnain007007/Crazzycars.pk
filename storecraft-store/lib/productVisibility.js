import { REDIRECTED_PRODUCT_SLUGS } from "@/lib/deletedUrlRedirects.mjs";

/**
 * Storefront visibility filter — active, not on security hold, and not a
 * permanently-redirected flat slug (DELETED_URL_REDIRECTS). HTML hits to those
 * slugs still 308 via next.config; listings must not emit the old URLs.
 */
export const STOREFRONT_PRODUCT_FILTER = {
  status: "active",
  securityHold: { $ne: true },
  slug: { $nin: REDIRECTED_PRODUCT_SLUGS },
};

/**
 * Website = the car store. Bike products (segment "bike") live in the app's Bikes store until the
 * website gets its own /bikes section. Apply to website listing, search, feeds and sitemaps only —
 * not to product detail, cart or checkout, which must still resolve bike products for the app.
 */
export const WEBSITE_SEGMENT_FILTER = { segment: { $in: ["car", null] } };
export const WEBSITE_PRODUCT_FILTER = {
  ...STOREFRONT_PRODUCT_FILTER,
  ...WEBSITE_SEGMENT_FILTER,
  "seo.excludeFromListings": { $ne: true },
};

/** Sitemap products: same as website listings, plus explicit sitemap exclusion. */
export const SITEMAP_LISTING_EXTRA = {
  "seo.excludeFromSitemap": { $ne: true },
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
