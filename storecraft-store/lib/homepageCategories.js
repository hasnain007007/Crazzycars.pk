/**
 * Featured categories shown on the homepage grid (max 10).
 * Shared by SSR homepage and the client CategoryGrid.
 */

export const HOMEPAGE_CATEGORY_LIMIT = 10;

export function flattenCategoryTree(nodes, depth = 0, out = []) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (!node) continue;
    out.push({ node, depth });
    flattenCategoryTree(node.children, depth + 1, out);
  }
  return out;
}

export function pickHomepageCategories(input, limit = HOMEPAGE_CATEGORY_LIMIT) {
  const seen = new Set();
  const byDepth = [];

  for (const { node, depth } of flattenCategoryTree(input)) {
    if (!node.slug || !node.name) continue;
    if (!(node.isFeatured || node.featured)) continue;
    const key = String(node._id || node.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    (byDepth[depth] ||= []).push(node);
  }

  return byDepth.flatMap((group) => group || []).slice(0, limit);
}

/** Flat props for homepage tiles — no nested children (keeps HTML small and serializable). */
export function serializeHomepageCategory(node) {
  if (!node) return null;
  const image =
    typeof node.image === "string"
      ? node.image
      : node.image?.url || node.imageUrl || "";
  return {
    _id: String(node._id || node.slug || ""),
    name: node.name,
    slug: node.slug,
    image,
    imageUrl: image,
    icon: node.icon || node.homepageIcon || "",
    homepageIcon: node.homepageIcon || node.icon || "",
    isFeatured: true,
  };
}
