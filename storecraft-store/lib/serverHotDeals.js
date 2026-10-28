/**
 * SSR hot deals for homepage (same query shape as /api/products/deals).
 */
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { buildDealsMongoFilter, discountFraction } from "@/lib/dealsFilter";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";

/**
 * @param {{ filter?: string, limit?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchHotDealsServer({ filter = "all", limit = 500 } = {}) {
  const lim = Math.min(500, Math.max(1, Number(limit) || 500));
  const f = String(filter || "all").toLowerCase();
  return unstable_cache(
    async () => {
      try {
        await dbConnect();
        const query = {
          ...WEBSITE_PRODUCT_FILTER,
          pricing: { $exists: true },
          ...buildDealsMongoFilter(f),
        };
        const found = await Product.find(query)
          .select(
            "name slug media.images pricing inventory featured isDeal newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
          )
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(500)
          .populate("categories", "name slug")
          .lean();
        // Biggest discount first — the point of Hot Deals (ties keep most-recently-updated order).
        const rows = found
          .map((row, i) => ({ row, i, d: discountFraction(row) }))
          .sort((a, b) => b.d - a.d || a.i - b.i)
          .slice(0, lim)
          .map((x) => x.row);

        return JSON.parse(
          JSON.stringify(rows.map((row) => serializeStoreProductSummary(row, { maxImages: 1 })))
        );
      } catch (err) {
        console.error("[fetchHotDealsServer]", err?.message || err);
        return [];
      }
    },
    ["hot-deals", f, String(lim)],
    { revalidate: 600, tags: ["products:home"] }
  )();
}
