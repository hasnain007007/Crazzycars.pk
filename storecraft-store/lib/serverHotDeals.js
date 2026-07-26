/**
 * SSR hot deals for homepage (same query shape as /api/products/deals).
 */
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";

function dealsExpr(filter) {
  if (filter === "under1000") {
    return {
      $and: [
        { $lt: ["$pricing.salePrice", 1000] },
        { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] },
      ],
    };
  }
  if (filter === "under700") {
    return {
      $and: [
        { $lt: ["$pricing.salePrice", 700] },
        { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] },
      ],
    };
  }
  if (filter === "fiftyoff") {
    return {
      $and: [
        { $gt: ["$pricing.regularPrice", 0] },
        { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] },
        {
          $gte: [
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$pricing.regularPrice", "$pricing.salePrice"] },
                    "$pricing.regularPrice",
                  ],
                },
                100,
              ],
            },
            50,
          ],
        },
      ],
    };
  }
  if (filter === "flash") {
    return {
      $or: [
        { isFlashDeal: true },
        { isDeal: true },
        { tags: { $elemMatch: { $regex: /^flash$/i } } },
        { $expr: { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] } },
      ],
    };
  }
  return { $expr: { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] } };
}

/**
 * @param {{ filter?: string, limit?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchHotDealsServer({ filter = "all", limit = 12 } = {}) {
  try {
    await dbConnect();
    const lim = Math.min(24, Math.max(1, Number(limit) || 12));
    const f = String(filter || "all").toLowerCase();
    const query = {
      status: "active",
      pricing: { $exists: true },
      ...dealsExpr(f),
    };
    const rows = await Product.find(query)
      .select(
        "name slug media.images pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .sort({ featured: -1, createdAt: -1 })
      .limit(lim)
      .populate("categories", "name slug")
      .lean();

    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[fetchHotDealsServer]", err?.message || err);
    return [];
  }
}
