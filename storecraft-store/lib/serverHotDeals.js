/**
 * SSR hot deals for homepage (same query shape as /api/products/deals).
 */
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { buildDealsMongoFilter } from "@/lib/dealsFilter";

/**
 * @param {{ filter?: string, limit?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchHotDealsServer({ filter = "all", limit = 12 } = {}) {
  try {
    await dbConnect();
    const lim = Math.min(48, Math.max(1, Number(limit) || 24));
    const f = String(filter || "all").toLowerCase();
    const query = {
      status: { $regex: /^active$/i },
      pricing: { $exists: true },
      ...buildDealsMongoFilter(f),
    };
    const rows = await Product.find(query)
      .select(
        "name slug media.images pricing inventory featured isDeal newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(lim)
      .populate("categories", "name slug")
      .lean();

    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[fetchHotDealsServer]", err?.message || err);
    return [];
  }
}
