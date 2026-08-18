/**
 * Canonical storefront PDP path. Mongo products live at /[slug].
 * Never emit Shopify-era /products/[handle] — Meta ads and bookmarks still
 * hit those URLs; next.config + middleware 308 them here.
 */
export function productPath(productOrSlug) {
  const slug =
    typeof productOrSlug === "string"
      ? productOrSlug.trim()
      : String(productOrSlug?.slug || productOrSlug?.handle || "").trim();
  if (!slug) return "/shop";
  return `/${slug.replace(/^\/+/, "")}`;
}
