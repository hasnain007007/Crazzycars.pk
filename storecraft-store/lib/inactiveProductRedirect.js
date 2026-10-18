/**
 * Resolve a permanent redirect target for inactive / archived products.
 * Prefer primary category → first compatible car → /.
 */

/**
 * @param {object|null} product lean product with populated categories / compatibleVehicles
 * @returns {string} path starting with /
 */
export function resolveInactiveProductRedirect(product) {
  if (!product || typeof product !== "object") return "/";

  const cats = Array.isArray(product.categories) ? product.categories : [];
  for (const c of cats) {
    const slug = String(c?.slug || "").trim();
    if (slug) return `/categories/${slug}`;
  }

  // Stored soft-delete hint (optional admin field).
  const stored =
    String(product.redirectTo || product.seo?.redirectTo || "").trim() ||
    String(product.primaryCategorySlug || "").trim();
  if (stored.startsWith("/")) return stored;
  if (stored) return `/categories/${stored}`;

  const cars = Array.isArray(product.compatibleVehicles)
    ? product.compatibleVehicles
    : Array.isArray(product.compatibleCars)
      ? product.compatibleCars
      : [];
  for (const v of cars) {
    const slug = String(v?.slug || "").trim();
    if (slug) return `/cars/${slug}`;
  }

  const carSlug = String(product.primaryCarSlug || product.carSlug || "").trim();
  if (carSlug) return `/cars/${carSlug}`;

  return "/";
}
