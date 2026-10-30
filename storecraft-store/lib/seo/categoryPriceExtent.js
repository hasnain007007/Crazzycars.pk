/**
 * Live min/max sale||regular for an active category tree (excludes securityHold).
 */
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";
import { getActiveDescendantCategoryIds } from "@/lib/storeCategoryData";

export function priceOf(p) {
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
    ...WEBSITE_PRODUCT_FILTER,
    $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
  })
    .select("pricing.regularPrice pricing.salePrice")
    .lean();

  const prices = (products || []).map(priceOf).filter((n) => n != null);
  if (!prices.length) return { min: null, max: null, n: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices), n: prices.length };
}

/** Same min/max for any product filter (car pages). */
export async function getProductPriceExtent(filter) {
  const products = await Product.find(filter).select("pricing.regularPrice pricing.salePrice").lean();
  const prices = (products || []).map(priceOf).filter((n) => n != null);
  if (!prices.length) return { min: null, max: null, n: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices), n: prices.length };
}

/** "Floor Mats price in Pakistan ranges from Rs 1,999 to Rs 7,999." (null when no prices) */
export function priceRangeSentence(label, extent) {
  if (!extent?.n || extent.min == null || extent.max == null) return null;
  const rs = (n) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
  if (extent.min === extent.max) return `${label} price in Pakistan: ${rs(extent.min)}.`;
  return `${label} price in Pakistan ranges from ${rs(extent.min)} to ${rs(extent.max)}.`;
}

/** schema.org AggregateOffer for a collection (PKR). */
export function aggregateOfferLd(extent) {
  if (!extent?.n || extent.min == null) return undefined;
  return {
    "@type": "AggregateOffer",
    priceCurrency: "PKR",
    lowPrice: Math.round(extent.min),
    highPrice: Math.round(extent.max),
    offerCount: extent.n,
  };
}
