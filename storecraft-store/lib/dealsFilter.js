/**
 * Mongo filter for Hot Deals tabs.
 * Supports: all | under1000 | under700 | under_1500 | under:2000 | fiftyoff | flash
 */
export function buildDealsMongoFilter(filter) {
  const f = String(filter || "all").toLowerCase().trim();

  const underMatch = f.match(/^under[_-]?(\d+)$/) || f.match(/^under:(\d+)$/);
  if (underMatch) {
    const max = Number(underMatch[1]);
    if (Number.isFinite(max) && max > 0) {
      return {
        $expr: {
          $and: [
            { $gt: ["$pricing.salePrice", 0] },
            { $lt: ["$pricing.salePrice", "$pricing.regularPrice"] },
            { $lt: ["$pricing.salePrice", max] },
          ],
        },
      };
    }
  }

  if (f === "fiftyoff" || f === "50off") {
    return {
      $expr: {
        $and: [
          { $gt: ["$pricing.regularPrice", 0] },
          { $gt: ["$pricing.salePrice", 0] },
          { $lt: ["$pricing.salePrice", "$pricing.regularPrice"] },
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
      },
    };
  }

  if (f === "flash") {
    return {
      $or: [
        { isDeal: true },
        { tags: { $elemMatch: { $regex: /^flash$/i } } },
        {
          $expr: {
            $and: [
              { $gt: ["$pricing.salePrice", 0] },
              { $lt: ["$pricing.salePrice", "$pricing.regularPrice"] },
            ],
          },
        },
      ],
    };
  }

  // Default: any active sale
  return {
    $expr: {
      $and: [
        { $gt: ["$pricing.salePrice", 0] },
        { $lt: ["$pricing.salePrice", "$pricing.regularPrice"] },
      ],
    },
  };
}

/** Suggest a filter key from a max price (admin helper). */
export function underFilterKey(maxPrice) {
  const n = Math.round(Number(maxPrice) || 0);
  return n > 0 ? `under${n}` : "all";
}
