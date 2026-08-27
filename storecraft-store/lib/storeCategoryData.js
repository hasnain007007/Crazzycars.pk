/**
 * Shared MongoDB reads for storefront category pages and API routes.
 * Single dbConnect per call site — callers await dbConnect() first or use helpers below.
 */
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { listingMongoSortSpec } from "@/lib/productListing";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgLoadCategories, pgLoadCategoryDetail } from "@/lib/pg/catalog";

/** Canonical storefront status — prefer equality over case-insensitive regex (index-friendly). */
export const ACTIVE_STATUS = "active";
const ACTIVE = ACTIVE_STATUS;

/** Resolve all parent ids for a category (multi-parent `parents` + legacy `parentCategory`). */
export function resolveParentIds(cat) {
  const ids = [];
  const seen = new Set();
  if (Array.isArray(cat.parents) && cat.parents.length) {
    for (const p of cat.parents) {
      const id = String(p?._id || p || "");
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  const legacy = cat.parentCategory?._id
    ? String(cat.parentCategory._id)
    : cat.parentCategory
      ? String(cat.parentCategory)
      : cat.parentId
        ? String(cat.parentId)
        : "";
  if (legacy && !seen.has(legacy)) ids.push(legacy);
  return ids;
}

/**
 * All strict descendant category _ids (active only).
 * Leaf categories: one cheap exists() and return [].
 * Parents: one category scan + in-memory BFS (no recursive DB round-trips).
 */
export async function getActiveDescendantCategoryIds(parentId) {
  const childFilter = {
    status: ACTIVE,
    $or: [{ parentCategory: parentId }, { parents: parentId }],
  };
  const hasChild = await Category.exists(childFilter);
  if (!hasChild) return [];

  const rows = await Category.find({ status: ACTIVE })
    .select("_id parents parentCategory parentId")
    .lean();
  if (!rows.length) return [];
  const childrenMap = buildChildrenIdMap(rows);
  const idSet = strictDescendantIdSet(parentId, childrenMap);
  if (!idSet.size) return [];
  const byId = new Map(rows.map((r) => [String(r._id), r._id]));
  return [...idSet].map((id) => byId.get(id)).filter(Boolean);
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
    for (const pid of resolveParentIds(c)) {
      if (map.has(pid)) map.get(pid).push(String(c._id));
    }
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

/**
 * Build AutoJin-style tree. Children with multiple parents appear under each parent.
 */
export function buildCategoryTree(categories) {
  const map = {};
  const roots = [];
  categories.forEach((cat) => {
    map[String(cat._id)] = { ...cat, children: [] };
  });
  categories.forEach((cat) => {
    const parentIds = resolveParentIds(cat);
    if (!parentIds.length) {
      roots.push(map[String(cat._id)]);
      return;
    }
    for (const parentId of parentIds) {
      if (map[parentId]) {
        map[parentId].children.push(map[String(cat._id)]);
      }
    }
  });
  roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));
  for (const node of Object.values(map)) {
    if (Array.isArray(node.children) && node.children.length > 1) {
      node.children.sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name))
      );
    }
  }
  return roots;
}

function isMediaUrl(value) {
  return /^(https?:\/\/|\/)/i.test(String(value || "").trim());
}

/** Slim tree payload for mega-menu / GET /api/categories/tree */
export function serializeCategoryTreeNode(node) {
  const image = typeof node.image === "string" ? node.image : node.image?.url || "";
  const icon = isMediaUrl(node.icon) ? String(node.icon) : "";
  const homepageIcon = String(node.homepageIcon || "").trim();
  return {
    _id: String(node._id || ""),
    name: node.name,
    slug: node.slug,
    image: isMediaUrl(image) ? image : "",
    icon,
    homepageIcon: isMediaUrl(homepageIcon) ? "" : homepageIcon,
    sortOrder: node.sortOrder || 0,
    isFeatured: Boolean(node.isFeatured || node.featured),
    children: Array.isArray(node.children) ? node.children.map(serializeCategoryTreeNode) : [],
  };
}

/**
 * Slim nested tree for mega-menu / header / footer / homepage grid.
 * Skips product counting and parent populates (not needed for navigation UI).
 */
export async function loadStoreCategoriesTreeSlim() {
  if (isPostgresCatalog()) {
    const rows = await pgLoadCategories({ includeProductCounts: false });
    return buildCategoryTree(rows);
  }
  const rows = await Category.find({ status: ACTIVE })
    .select(
      "name slug image icon homepageIcon sortOrder isFeatured featured level parents parentCategory parentId"
    )
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .lean();

  const categories = rows.map((c) => ({
    ...c,
    isFeatured: Boolean(c.isFeatured || c.featured),
  }));

  return buildCategoryTree(categories);
}

/** Active categories with product counts (self + all active subcategories); returns tree when wantTree. */
export async function loadStoreCategoriesTree(wantTree, opts = {}) {
  if (isPostgresCatalog()) {
    const categories = await pgLoadCategories({
      featuredOnly: Boolean(opts.featuredOnly),
      showOnHomepageOnly: Boolean(opts.showOnHomepageOnly),
      includeProductCounts: opts.includeProductCounts !== false,
    });
    return wantTree ? buildCategoryTree(categories) : categories;
  }
  const featuredOnly = Boolean(opts.featuredOnly);
  const showInFooterOnly = Boolean(opts.showInFooterOnly);
  const showOnHomepageOnly = Boolean(opts.showOnHomepageOnly);
  const includeProductCounts = opts.includeProductCounts !== false;
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
    .populate("parents", "name slug")
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .lean();

  const categoryIds = rows.map((c) => c._id);
  const idStrSet = new Set(categoryIds.map(String));
  const childrenMap = buildChildrenIdMap(rows);

  let products = [];
  if (includeProductCounts && categoryIds.length) {
    products = await Product.find({
      status: ACTIVE,
      $or: [{ categories: { $in: categoryIds } }, { category: { $in: categoryIds } }],
    })
      .select("categories category")
      .lean();
  }

  const categories = rows.map((c) => {
    const parentIds = resolveParentIds(c);
    const parentId = parentIds[0] || null;
    const self = String(c._id);
    const scope = new Set([self, ...strictDescendantIdSet(c._id, childrenMap)]);
    const scoped = new Set([...scope].filter((id) => idStrSet.has(id)));
    return {
      ...c,
      parentId,
      parentIds,
      parentName: c.parentCategory?.name || "",
      parentCategory: parentId
        ? { _id: parentId, name: c.parentCategory?.name || "" }
        : null,
      productCount: includeProductCounts ? countProductsInScope(products, scoped) : 0,
      subcategoryCount: (childrenMap.get(self) || []).length,
    };
  });

  return wantTree ? buildCategoryTree(categories) : categories;
}

/** Max products embedded in category SSR payload (first page only). Matches shop default. */
const CATEGORY_PAGE_PRODUCT_LIMIT = 40;

export async function loadStoreCategoryDetail(slugStr, opts = {}) {
  if (isPostgresCatalog()) {
    return pgLoadCategoryDetail(slugStr, opts);
  }
  const limit = Math.min(
    48,
    Math.max(1, Number(opts.limit) || CATEGORY_PAGE_PRODUCT_LIMIT)
  );
  const page = Math.max(1, Number(opts.page) || 1);
  const skip = (page - 1) * limit;

  const category = await Category.findOne({
    slug: slugStr,
    status: ACTIVE,
  })
    .populate("parentCategory", "name slug")
    .populate("parents", "name slug")
    .populate("ancestors", "name slug")
    .lean();

  if (!category) return null;

  const catId = category._id;

  const [subcategories, descendantIds] = await Promise.all([
    Category.find({
      status: ACTIVE,
      $or: [{ parentCategory: catId }, { parents: catId }],
    })
      .select("name slug image shortDescription level sortOrder")
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    getActiveDescendantCategoryIds(catId),
  ]);

  const allCategoryIds = [catId, ...descendantIds];
  const productQuery = {
    status: ACTIVE,
    $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
  };

  const sortSpec = listingMongoSortSpec(opts.sort);

  const [products, productCount] = await Promise.all([
    Product.find(productQuery)
      .select(
        "name slug media.images pricing.regularPrice pricing.salePrice inventory featured newArrival status createdAt shortDescription articleNo categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .populate("categories", "name slug")
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(productQuery),
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

  return {
    category,
    subcategories,
    products,
    breadcrumbs,
    /** Alias for clients expecting `breadcrumb` */
    breadcrumb: breadcrumbs,
    productCount,
    totalIncludingSubcategories: productCount,
    page,
    limit,
    totalPages: Math.ceil(productCount / limit) || 1,
  };
}
