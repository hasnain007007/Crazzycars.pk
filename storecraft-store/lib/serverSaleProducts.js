/**
 * SSR sale listings — same discount / price filters as /api/products.
 */
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { getSaleTab, SALE_SSR_LIMIT } from "@/lib/saleTabs";

function effectivePriceExpr() {
  return {
    $cond: [
      {
        $and: [
          { $gt: [{ $ifNull: ["$pricing.salePrice", 0] }, 0] },
          { $lt: [{ $ifNull: ["$pricing.salePrice", 0] }, { $ifNull: ["$pricing.regularPrice", 0] }] },
        ],
      },
      { $ifNull: ["$pricing.salePrice", 0] },
      { $ifNull: ["$pricing.regularPrice", 0] },
    ],
  };
}

function buildSaleMongoFilter(tab) {
  const andParts = [];

  if (tab.minDiscount != null && tab.minDiscount > 0) {
    andParts.push({
      $expr: {
        $and: [
          { $gt: [{ $ifNull: ["$pricing.regularPrice", 0] }, 0] },
          { $gt: [{ $ifNull: ["$pricing.salePrice", 0] }, 0] },
          {
            $lt: [{ $ifNull: ["$pricing.salePrice", 0] }, { $ifNull: ["$pricing.regularPrice", 0] }],
          },
          {
            $gte: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ["$pricing.regularPrice", 0] },
                          { $ifNull: ["$pricing.salePrice", 0] },
                        ],
                      },
                      { $ifNull: ["$pricing.regularPrice", 1] },
                    ],
                  },
                  100,
                ],
              },
              tab.minDiscount,
            ],
          },
        ],
      },
    });
  }

  if (tab.maxPrice != null && tab.maxPrice >= 0) {
    andParts.push({
      $expr: { $lte: [effectivePriceExpr(), tab.maxPrice] },
    });
  }

  return andParts.length ? { $and: andParts } : {};
}

/**
 * @param {{ tabId?: string, limit?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchSaleProductsServer({
  tabId,
  limit = SALE_SSR_LIMIT,
} = {}) {
  try {
    await dbConnect();
    const tab = getSaleTab(tabId);
    const lim = Math.min(48, Math.max(1, Number(limit) || SALE_SSR_LIMIT));
    const filter = {
      status: { $regex: /^active$/i },
      ...buildSaleMongoFilter(tab),
    };

    const rows = await Product.find(filter)
      .select(
        "name slug media.images pricing inventory featured isDeal newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews articleNo"
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(lim)
      .populate("categories", "name slug")
      .lean();

    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[fetchSaleProductsServer]", err?.message || err);
    return [];
  }
}
