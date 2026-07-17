import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Effective list price for filtering: sale price when valid sale, else regular. */
function effectivePriceExpr() {
  return {
    $cond: [
      {
        $and: [
          { $gt: [{ $ifNull: ["$pricing.salePrice", 0] }, 0] },
          {
            $lt: [{ $ifNull: ["$pricing.salePrice", 0] }, { $ifNull: ["$pricing.regularPrice", 0] }],
          },
        ],
      },
      { $ifNull: ["$pricing.salePrice", 0] },
      { $ifNull: ["$pricing.regularPrice", 0] },
    ],
  };
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const categorySlug = (searchParams.get("category") || "").trim().toLowerCase();
    const sort = (searchParams.get("sort") || "newest").trim();
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit"), 10) || 12));
    const skip = (page - 1) * limit;

    const countOnly = searchParams.get("countOnly") === "true";
    const maxPriceRaw = searchParams.get("maxPrice");
    const minDiscountRaw = searchParams.get("minDiscount");
    const carMake = (searchParams.get("carMake") || "").trim();
    const carModel = (searchParams.get("carModel") || "").trim();
    const carGeneration = (searchParams.get("carGeneration") || "").trim();

    const featuredFlag =
      searchParams.get("featured") === "true" || searchParams.get("featured") === "1";
    const newArrivalTrue =
      searchParams.get("newArrival") === "true" ||
      searchParams.get("newArrival") === "1" ||
      searchParams.get("new") === "1";
    const saleParam = searchParams.get("sale") === "true" || searchParams.get("deals") === "true";

    const filter = { status: { $regex: /^active$/i } };
    const andParts = [];

    if (featuredFlag) {
      filter.featured = true;
    }
    if (newArrivalTrue) {
      filter.newArrival = true;
    }

    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug, status: "active" }).select("_id").lean();
      if (cat?._id) filter.categories = cat._id;
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      andParts.push({
        $or: [{ name: rx }, { slug: rx }, { articleNo: rx }, { shortDescription: rx }],
      });
    }

    if (carMake || carModel || carGeneration) {
      const mkRx = carMake ? new RegExp(`^${escapeRegex(carMake)}$`, "i") : null;
      const mdRx = carModel ? new RegExp(`^${escapeRegex(carModel)}$`, "i") : null;
      const universalOr = [{ isUniversal: true }, { "vehicleCompatibility.fitmentType": "universal" }];
      const legacyMatch = {};
      if (carMake) legacyMatch.make = mkRx;
      if (carModel) legacyMatch.model = mdRx;
      if (carGeneration) legacyMatch.generation = new RegExp(`^${escapeRegex(carGeneration)}$`, "i");
      if (Object.keys(legacyMatch).length) {
        universalOr.push({ compatibleCars: { $elemMatch: legacyMatch } });
      }
      const vcMatch = {};
      if (carMake) vcMatch.make = mkRx;
      if (carModel) vcMatch.model = mdRx;
      if (Object.keys(vcMatch).length) {
        universalOr.push({
          "vehicleCompatibility.fitmentType": "specific",
          "vehicleCompatibility.vehicles": { $elemMatch: vcMatch },
        });
      }
      andParts.push({ $or: universalOr });
    }

    if (saleParam) {
      andParts.push({
        $expr: {
          $and: [
            { $gt: [{ $ifNull: ["$pricing.salePrice", 0] }, 0] },
            { $lt: [{ $ifNull: ["$pricing.salePrice", 0] }, { $ifNull: ["$pricing.regularPrice", 0] }] },
          ],
        },
      });
    }

    const maxPrice = maxPriceRaw != null && maxPriceRaw !== "" ? Number(maxPriceRaw) : null;
    if (maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0) {
      andParts.push({
        $expr: {
          $lte: [effectivePriceExpr(), maxPrice],
        },
      });
    }

    const minDiscount = minDiscountRaw != null && minDiscountRaw !== "" ? Number(minDiscountRaw) : null;
    if (minDiscount != null && Number.isFinite(minDiscount) && minDiscount > 0) {
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
                minDiscount,
              ],
            },
          ],
        },
      });
    }

    if (andParts.length) {
      filter.$and = andParts;
    }

    let sortSpec = { createdAt: -1 };
    if (sort === "price-asc") sortSpec = { "pricing.regularPrice": 1 };
    if (sort === "price-desc") sortSpec = { "pricing.regularPrice": -1 };
    if (sort === "name") sortSpec = { name: 1 };
    if (sort === "featured") sortSpec = { featured: -1, createdAt: -1 };
    if (sort === "popular") sortSpec = { reviewCount: -1, createdAt: -1 };

    if (countOnly) {
      const total = await Product.countDocuments(filter);
      return NextResponse.json(
        { success: true, count: total },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    const [rows, total] = await Promise.all([
      Product.find(filter)
        .select(
          "name slug media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants isUniversal compatibleCars vehicleCompatibility rating averageRating ratingAverage reviewCount totalReviews numReviews reviews"
        )
        .populate("categories", "name slug")
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        success: true,
        products: rows.map(serializeStoreProductSummary),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load products." }, { status: 500 });
  }
}
