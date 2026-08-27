import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import {
  parseSearchQuery,
  queryProductsSmart,
  scoreSearchCandidate,
} from "@/lib/smartProductSearch";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import {
  isConfidentMissingSuggestion,
  looksLikeProductSlug,
  slugParamToSearchQuery,
} from "@/lib/missingProductHelpers";

export {
  FAST_404_CATEGORIES,
  isConfidentMissingSuggestion,
  looksLikeProductSlug,
  slugFromPathname,
  slugParamToSearchQuery,
} from "@/lib/missingProductHelpers";

const SELECT =
  "name slug media.images pricing.regularPrice pricing.salePrice pricing.saleSchedule tags articleNo compatibleCars.make compatibleCars.model categories shortDescription inventory featured newArrival createdAt rating averageRating ratingAverage reviewCount totalReviews numReviews";

/**
 * 2–3 high-confidence replacements for a product-like 404 slug.
 * Empty array when nothing is confident — never pad with random catalog rows.
 */
export async function suggestProductsForMissingSlug(rawSlug, opts = {}) {
  const slug = String(rawSlug || "").trim();
  if (!looksLikeProductSlug(slug)) return [];

  const q = slugParamToSearchQuery(slug);
  if (q.length < 4) return [];

  const limit = Math.min(3, Math.max(1, opts.limit || 3));
  try {
    await dbConnect();
    const parsed = parseSearchQuery(q);
    const { rows } = await queryProductsSmart(Product, { status: "active" }, q, {
      limit: 8,
      skip: 0,
      select: SELECT,
      populate: "categories",
      candidateLimit: 32,
      countTotal: false,
      maxTimeMS: opts.maxTimeMS || 1500,
    });

    const ranked = (rows || [])
      .map((doc) => ({
        doc,
        smart: scoreSearchCandidate(doc, parsed, 0),
      }))
      .filter(({ doc, smart }) => isConfidentMissingSuggestion(doc, parsed, smart))
      .sort((a, b) => b.smart - a.smart)
      .slice(0, limit);

    return JSON.parse(
      JSON.stringify(ranked.map(({ doc }) => serializeStoreProductSummary(doc)))
    );
  } catch (err) {
    console.error("[suggestProductsForMissingSlug]", err?.message || err);
    return [];
  }
}

export async function loadSimilarActiveProducts(product, { limit = 6 } = {}) {
  if (!product?._id) return [];
  try {
    await dbConnect();
    const categoryIds = (product.categories || [])
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "object" && c._id) return c._id;
        return c;
      })
      .filter(Boolean);

    let rows = [];
    if (categoryIds.length) {
      rows = await Product.find({
        status: "active",
        _id: { $ne: product._id },
        categories: { $in: categoryIds },
      })
        .select(SELECT)
        .populate("categories", "name slug")
        .sort({ createdAt: -1 })
        .limit(24)
        .maxTimeMS(2000)
        .lean();
    }

    const parsed = parseSearchQuery(
      `${product.name || ""} ${slugParamToSearchQuery(product.slug || "")}`
    );
    const vehicleOk = (doc) => {
      const hay = `${doc?.name || ""} ${String(doc?.slug || "").replace(/-/g, " ")}`.toLowerCase();
      if (parsed.modelTokens?.length && !parsed.modelTokens.some((m) => hay.includes(m))) {
        return false;
      }
      if (parsed.makeTokens?.length && !parsed.makeTokens.some((m) => hay.includes(m))) {
        return false;
      }
      return true;
    };

    let serialized = JSON.parse(
      JSON.stringify(rows.filter(vehicleOk).map((doc) => serializeStoreProductSummary(doc)))
    );

    if (serialized.length < Math.min(2, limit)) {
      const extra = await suggestProductsForMissingSlug(product.slug || "", { limit });
      const seen = new Set(serialized.map((p) => p.slug));
      for (const item of extra) {
        if (item?.slug && !seen.has(item.slug)) {
          serialized.push(item);
          seen.add(item.slug);
        }
      }
    }

    return serialized.slice(0, limit);
  } catch (err) {
    console.error("[loadSimilarActiveProducts]", err?.message || err);
    return [];
  }
}
