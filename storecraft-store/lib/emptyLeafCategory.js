/**
 * Zero products on this shelf and every descendant.
 * A 200 + “No products found” page is a Google Soft 404, even with noindex.
 */
export function isEmptyCategoryTree(detail) {
  if (!detail) return false;
  return (Number(detail.productCount) || 0) === 0;
}

/** @deprecated use {@link isEmptyCategoryTree} */
export function isEmptyLeafCategory(detail) {
  return isEmptyCategoryTree(detail);
}

/** Drop nav/sitemap nodes whose whole subtree has no active products. */
export function pruneCategoryTreeWithoutProducts(nodes, withProductIds) {
  const keep = (node) => {
    if (!node) return null;
    const children = (Array.isArray(node.children) ? node.children : []).map(keep).filter(Boolean);
    const id = String(node._id || "");
    if ((id && withProductIds.has(id)) || children.length) {
      return { ...node, children };
    }
    return null;
  };
  return (Array.isArray(nodes) ? nodes : []).map(keep).filter(Boolean);
}

export function collectCategorySlugs(nodes, out = new Set()) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (node?.slug) out.add(String(node.slug));
    if (node?.children?.length) collectCategorySlugs(node.children, out);
  }
  return out;
}

function categorySlugFromHref(href) {
  const path = String(href || "").split("?")[0].split("#")[0];
  const m = path.match(/\/categories\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : "";
}

/** Drop settings/nav links that point at empty category shelves. */
export function filterLinksToLiveCategories(links, liveSlugs) {
  if (!Array.isArray(links)) return [];
  return links.filter((link) => {
    const slug = categorySlugFromHref(link?.href || link?.url);
    return !slug || liveSlugs.has(slug);
  });
}
