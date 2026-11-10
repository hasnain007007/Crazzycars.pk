/**
 * Canonical storefront PDP path. Mongo products live at /[slug].
 * Never emit Shopify-era /products/[handle] — Meta ads and bookmarks still
 * hit those URLs; next.config + middleware 308 them here.
 */
export function productPath(productOrSlug) {
  const raw =
    typeof productOrSlug === "string"
      ? productOrSlug
      : productOrSlug?.slug || productOrSlug?.handle || "";
  // Objects String()'d become "[object Object]" — never emit that as a path (T10g).
  if (raw && typeof raw === "object") return "/shop";
  const slug = String(raw || "")
    .trim()
    .replace(/^\/+/, "");
  if (!slug || slug === "[object Object]" || slug === "undefined") return "/shop";
  return `/${slug}`;
}
