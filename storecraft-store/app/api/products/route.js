import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { buildMakeModelProductOr } from "@/lib/productVehicleQuery";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { queryProductsWithSearch } from "@/lib/productSearch";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

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
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit"), 10) || 12));
    const skip = (page - 1) * limit;

    const countOnly = searchParams.get("countOnly") === "true";
    const maxPriceRaw = searchParams.get("maxPrice");
    const minPriceRaw = searchParams.get("minPrice");
    const minDiscountRaw = searchParams.get("minDiscount");
    const brand = (searchParams.get("brand") || "").trim();
    const inStockOnly =
      searchParams.get("inStock") === "true" || searchParams.get("inStock") === "1";
    const outOfStockOnly =
      searchParams.get("outOfStock") === "true" || searchParams.get("outOfStock") === "1";
    const carMake = (searchParams.get("carMake") || searchParams.get("make") || "").trim();
    const carModel = (searchParams.get("carModel") || searchParams.get("model") || "").trim();
    const carGeneration = (searchParams.get("carGeneration") || "").trim();

    const featuredFlag =
      searchParams.get("featured") === "true" || searchParams.get("featured") === "1";
    const newArrivalTrue =
      searchParams.get("newArrival") === "true" ||
      searchParams.get("newArrival") === "1" ||
      searchParams.get("new") === "1";
    const saleParam = searchParams.get("sale") === "true" || searchParams.get("deals") === "true";

    const filter = { ...STOREFRONT_PRODUCT_FILTER };
    const andParts = [];

    if (featuredFlag) {
      andParts.push({ $or: [{ featured: true }, { isFeatured: true }] });
    }
    if (newArrivalTrue) {
      filter.newArrival = true;
    }

    if (categorySlug) {
      const cat = await Category.findOne({
        slug: categorySlug,
        status: "active",
      })
        .select("_id")
        .lean();
      if (cat?._id) {
        const { getActiveDescendantCategoryIds } = await import("@/lib/storeCategoryData");
        const descendantIds = await getActiveDescendantCategoryIds(cat._id);
        const allIds = [cat._id, ...descendantIds];
        andParts.push({
          $or: [{ categories: { $in: allIds } }, { category: { $in: allIds } }],
        });
      } else {
        // Unknown slug → empty result set
        filter._id = null;
      }
    }

    // Search (`q`) applied in queryProductsWithSearch ($text → regex fallback).

    if (carMake || carModel || carGeneration) {
      // Prefer Vehicle ObjectId fitment: compatibleVehicles (+ legacy specific). Universal not auto-included.
      // Also keep legacy string fitment fields for older products.
      const carYear = (searchParams.get("carYear") || searchParams.get("year") || "").trim();
      const { $or: vehicleOr } = await buildMakeModelProductOr(
        carMake,
        carModel,
        carYear || null
      );
      if (carGeneration) {
        const genRx = new RegExp(`^${escapeRegex(carGeneration)}$`, "i");
        vehicleOr.push({ compatibleCars: { $elemMatch: { generation: genRx } } });
      }
      andParts.push({ $or: vehicleOr });
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

    const minPrice = minPriceRaw != null && minPriceRaw !== "" ? Number(minPriceRaw) : null;
    if (minPrice != null && Number.isFinite(minPrice) && minPrice >= 0) {
      andParts.push({
        $expr: {
          $gte: [effectivePriceExpr(), minPrice],
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

    if (brand) {
      const brandRx = new RegExp(escapeRegex(brand), "i");
      andParts.push({
        $or: [{ vendor: brandRx }, { brand: brandRx }, { tags: brandRx }],
      });
    }

    // Soft stock hints — storefront also marks allowBackorder / trackInventory in serialize.
    if (inStockOnly && !outOfStockOnly) {
      andParts.push({
        $or: [
          { "inventory.trackInventory": false },
          { "inventory.allowBackorder": true },
          { "inventory.quantity": { $gt: 0 } },
          { "inventory.stock": { $gt: 0 } },
        ],
      });
    } else if (outOfStockOnly && !inStockOnly) {
      andParts.push({
        "inventory.trackInventory": { $ne: false },
        "inventory.allowBackorder": { $ne: true },
        "inventory.quantity": { $lte: 0 },
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
    if (sort === "rating") {
      sortSpec = { averageRating: -1, ratingAverage: -1, rating: -1, reviewCount: -1 };
    }

    if (countOnly) {
      if (q) {
        const { total } = await queryProductsWithSearch(Product, filter, q, {
          limit: 1,
          skip: 0,
          sortSpec,
        });
        return NextResponse.json(
          { success: true, count: total },
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
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

    let rows;
    let total;
    if (q) {
      const result = await queryProductsWithSearch(Product, filter, q, {
        limit,
        skip,
        sortSpec,
        select:
          "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags",
        populate: "categories",
      });
      rows = result.rows;
      total = result.total;
    } else {
      [rows, total] = await Promise.all([
        Product.find(filter)
          .select(
            "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags codEnabled isBulky advancePercentRequired"
          )
          .populate("categories", "name slug")
          .sort(sortSpec)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);
    }

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
