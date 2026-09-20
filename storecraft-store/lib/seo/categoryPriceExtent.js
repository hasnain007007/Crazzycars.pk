/**
 * Live min/max sale||regular for an active category tree (excludes securityHold).
 */
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { getActiveDescendantCategoryIds } from "@/lib/storeCategoryData";

function priceOf(p) {
  const sale = Number(p?.pricing?.salePrice);
  const regular = Number(p?.pricing?.regularPrice);
  if (Number.isFinite(sale) && sale > 0 && (!Number.isFinite(regular) || sale < regular)) {
    return sale;
  }
  if (Number.isFinite(regular) && regular > 0) return regular;
  return null;
}

/**
 * @param {string} slug
 * @returns {Promise<{ min: number|null, max: number|null, n: number }>}
 */
export async function getCategoryPriceExtent(slug) {
  const slugStr = String(slug || "").trim();
  if (!slugStr) return { min: null, max: null, n: 0 };

  const category = await Category.findOne({ slug: slugStr, status: "active" })
    .select("_id")
    .lean();
  if (!category?._id) return { min: null, max: null, n: 0 };

  const descendantIds = await getActiveDescendantCategoryIds(category._id);
  const allCategoryIds = [category._id, ...descendantIds];

  const products = await Product.find({
    ...STOREFRONT_PRODUCT_FILTER,
    $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
  })
    .select("pricing.regularPrice pricing.salePrice")
    .lean();

  const prices = (products || []).map(priceOf).filter((n) => n != null);
  if (!prices.length) return { min: null, max: null, n: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices), n: prices.length };
}
