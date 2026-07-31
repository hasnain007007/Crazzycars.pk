/**
 * Mongo filter for Hot Deals tabs.
 * Primary source: products with isDeal=true (toggled in admin).
 * Supports: all | under1000 | under700 | under_1500 | under:2000 | fiftyoff | flash
 */

function effectivePriceExpr() {
  return {
    $cond: [
      {
        $and: [
          { $gt: ["$pricing.salePrice", 0] },
          { $lt: ["$pricing.salePrice", "$pricing.regularPrice"] },
        ],
      },
      "$pricing.salePrice",
      "$pricing.regularPrice",
    ],
  };
}

export function buildDealsMongoFilter(filter) {
  const f = String(filter || "all").toLowerCase().trim();
  const dealBase = { isDeal: true };

  const underMatch = f.match(/^under[_-]?(\d+)$/) || f.match(/^under:(\d+)$/);
  if (underMatch) {
    const max = Number(underMatch[1]);
    if (Number.isFinite(max) && max > 0) {
      return {
        ...dealBase,
        $expr: { $lt: [effectivePriceExpr(), max] },
      };
    }
  }

  if (f === "fiftyoff" || f === "50off") {
    return {
      ...dealBase,
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

  // "all" and "flash" (and unknown keys): every Hot Deal product
  return dealBase;
}

/** Suggest a filter key from a max price (admin helper). */
export function underFilterKey(maxPrice) {
  const n = Math.round(Number(maxPrice) || 0);
  return n > 0 ? `under${n}` : "all";
}
