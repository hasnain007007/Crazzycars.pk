/** Empty leaf shelf — 200 + "No products found" is a Google Soft 404. */
export function isEmptyLeafCategory(detail) {
  if (!detail) return false;
  const count = Number(detail.productCount) || 0;
  const subs = Array.isArray(detail.subcategories) ? detail.subcategories.length : 0;
  return count === 0 && subs === 0;
}
