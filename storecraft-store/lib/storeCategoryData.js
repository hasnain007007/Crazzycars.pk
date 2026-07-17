/**
 * Shared MongoDB reads for storefront category pages and API routes.
 * Single dbConnect per call site — callers await dbConnect() first or use helpers below.
 */
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";

const ACTIVE = { $regex: /^active$/i };

/** All strict descendant category _ids (active categories only). */
export async function getActiveDescendantCategoryIds(parentId) {
  const children = await Category.find({
    parentCategory: parentId,
    status: ACTIVE,
  })
    .select("_id")
    .lean();
  if (!children.length) return [];
  const childIds = children.map((c) => c._id);
  const nested = await Promise.all(childIds.map((id) => getActiveDescendantCategoryIds(id)));
  return [...childIds, ...nested.flat()];
}

function productRefsForCounting(p) {
  const refs = new Set();
  for (const c of p.categories || []) {
    if (c != null) refs.add(String(c));
  }
  if (p.category != null) refs.add(String(p.category));
  return refs;
}

/** In-memory: distinct products whose categories intersect `scopeIdStrings` (Set of string ids). */
function countProductsInScope(products, scopeIdStrings) {
  let n = 0;
  for (const p of products) {
    const refs = productRefsForCounting(p);
    let hit = false;
    for (const r of refs) {
      if (scopeIdStrings.has(r)) {
        hit = true;
        break;
      }
    }
    if (hit) n += 1;
  }
  return n;
}

function buildChildrenIdMap(rows) {
  const map = new Map();
  for (const c of rows) {
    const id = String(c._id);
    if (!map.has(id)) map.set(id, []);
  }
  for (const c of rows) {
    const pid = c.parentCategory?._id ? String(c.parentCategory._id) : c.parentCategory ? String(c.parentCategory) : "";
    if (pid && map.has(pid)) map.get(pid).push(String(c._id));
  }
  return map;
}

function strictDescendantIdSet(rootId, childrenMap) {
  const root = String(rootId);
  const stack = [...(childrenMap.get(root) || [])];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const ch of childrenMap.get(id) || []) stack.push(ch);
  }
  return seen;
}

export function buildCategoryTree(categories) {
  const map = {};
  const roots = [];
  categories.forEach((cat) => {
    map[String(cat._id)] = { ...cat, children: [] };
  });
  categories.forEach((cat) => {
    const parentId = cat.parentCategory?._id
      ? String(cat.parentCategory._id)
      : cat.parentCategory
        ? String(cat.parentCategory)
        : "";
    if (!parentId) {
      roots.push(map[String(cat._id)]);
      return;
    }
    if (map[parentId]) map[parentId].children.push(map[String(cat._id)]);
  });
  return roots;
}

/** Active categories with product counts (self + all active subcategories); returns tree when wantTree. */
export async function loadStoreCategoriesTree(wantTree, opts = {}) {
  const featuredOnly = Boolean(opts.featuredOnly);
  const showInFooterOnly = Boolean(opts.showInFooterOnly);
  const showOnHomepageOnly = Boolean(opts.showOnHomepageOnly);
  const filter = { status: ACTIVE };
  if (featuredOnly) {
    filter.$or = [{ featured: true }, { isFeatured: true }];
  }
  if (showInFooterOnly) {
    filter.showInFooter = true;
  }
  if (showOnHomepageOnly) {
    filter.showOnHomepage = true;
  }

  const rows = await Category.find(filter)
    .populate("parentCategory", "name slug")
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .lean();

  const categoryIds = rows.map((c) => c._id);
  const idStrSet = new Set(categoryIds.map(String));

  const products = await Product.find({
    status: ACTIVE,
    $or: [{ categories: { $in: categoryIds } }, { category: { $in: categoryIds } }],
  })
    .select("categories category")
    .lean();

  const childrenMap = buildChildrenIdMap(rows);

  const categories = rows.map((c) => {
    const parentId = c.parentCategory?._id
      ? String(c.parentCategory._id)
      : c.parentCategory
        ? String(c.parentCategory)
        : null;
    const self = String(c._id);
    const scope = new Set([self, ...strictDescendantIdSet(c._id, childrenMap)]);
    const scoped = new Set([...scope].filter((id) => idStrSet.has(id)));
    return {
      ...c,
      parentId,
      parentName: c.parentCategory?.name || "",
      parentCategory: parentId ? { _id: parentId, name: c.parentCategory?.name || "" } : null,
      productCount: countProductsInScope(products, scoped),
      subcategoryCount: (childrenMap.get(self) || []).length,
    };
  });

  return wantTree ? buildCategoryTree(categories) : categories;
}

export async function loadStoreCategoryDetail(slugStr) {
  const category = await Category.findOne({
    slug: slugStr,
    status: { $regex: /^active$/i },
  })
    .populate("parentCategory", "name slug")
    .populate("ancestors", "name slug")
    .lean();

  if (!category) return null;

  const catId = category._id;
  const descendantIds = await getActiveDescendantCategoryIds(catId);
  const allCategoryIds = [catId, ...descendantIds];

  const productQuery = {
    status: ACTIVE,
    $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
  };

  const [subcategories, products] = await Promise.all([
    Category.find({
      parentCategory: catId,
      status: { $regex: /^active$/i },
    })
      .select("name slug image shortDescription level sortOrder")
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    Product.find(productQuery)
      .select(
        "name slug media pricing inventory simpleVariations variationCombinations featured newArrival categories category status createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const breadcrumbs = [];
  const anc = category.ancestors;
  if (Array.isArray(anc) && anc.length > 0 && anc[0] && typeof anc[0] === "object" && anc[0].name) {
    for (const a of anc) {
      breadcrumbs.push({ _id: a._id, name: a.name, slug: a.slug });
    }
  } else if (category.parentCategory && typeof category.parentCategory === "object" && category.parentCategory.name) {
    breadcrumbs.push({
      _id: category.parentCategory._id,
      name: category.parentCategory.name,
      slug: category.parentCategory.slug,
    });
  }
  breadcrumbs.push({ _id: category._id, name: category.name, slug: category.slug });

  const productCount = products.length;

  return {
    category,
    subcategories,
    products,
    breadcrumbs,
    /** Alias for clients expecting `breadcrumb` */
    breadcrumb: breadcrumbs,
    productCount,
    totalIncludingSubcategories: productCount,
  };
}
