import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { queryProductsWithSearch } from "@/lib/productSearch";
import { listingMongoSortSpec, listingSortToApi } from "@/lib/productListing";
import { parseListingSearchParams } from "@/lib/listingQuery";
import { getActiveDescendantCategoryIds } from "@/lib/storeCategoryData";
import { buildMakeModelProductOr } from "@/lib/productVehicleQuery";

/** Fields needed for product cards / homepage grids. */
export const PRODUCT_CARD_SELECT =
  "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags compatibleCars vehicleCompatibility";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function applyShopListingFilters(filter, listing) {
  const andParts = [];

  if (listing.category) {
    const cat = await Category.findOne({
      slug: String(listing.category).toLowerCase(),
      status: "active",
    })
      .select("_id")
      .lean();
    if (cat?._id) {
      const descendantIds = await getActiveDescendantCategoryIds(cat._id);
      const allIds = [cat._id, ...descendantIds];
      andParts.push({
        $or: [{ categories: { $in: allIds } }, { category: { $in: allIds } }],
      });
    } else {
      filter._id = null;
    }
  }

  if (listing.make || listing.model || listing.year) {
    const { $or: vehicleOr } = await buildMakeModelProductOr(
      listing.make,
      listing.model,
      listing.year || null
    );
    andParts.push({ $or: vehicleOr });
  }

  if (listing.sale || listing.deals) {
    andParts.push({
      $expr: {
        $and: [
          { $gt: [{ $ifNull: ["$pricing.salePrice", 0] }, 0] },
          {
            $lt: [{ $ifNull: ["$pricing.salePrice", 0] }, { $ifNull: ["$pricing.regularPrice", 0] }],
          },
        ],
      },
    });
  }

  const minPrice = listing.minPrice !== "" ? Number(listing.minPrice) : null;
  if (minPrice != null && Number.isFinite(minPrice) && minPrice >= 0) {
    andParts.push({ $expr: { $gte: [effectivePriceExpr(), minPrice] } });
  }
  const maxPrice = listing.maxPrice !== "" ? Number(listing.maxPrice) : null;
  if (maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0) {
    andParts.push({ $expr: { $lte: [effectivePriceExpr(), maxPrice] } });
  }

  if (listing.brand) {
    const brandRx = new RegExp(escapeRegex(listing.brand), "i");
    andParts.push({
      $or: [{ vendor: brandRx }, { brand: brandRx }, { tags: brandRx }],
    });
  }

  if (listing.inStock && !listing.outOfStock) {
    andParts.push({
      $or: [
        { "inventory.trackInventory": false },
        { "inventory.allowBackorder": true },
        { "inventory.quantity": { $gt: 0 } },
        { "inventory.stock": { $gt: 0 } },
      ],
    });
  } else if (listing.outOfStock && !listing.inStock) {
    andParts.push({
      "inventory.trackInventory": { $ne: false },
      "inventory.allowBackorder": { $ne: true },
      "inventory.quantity": { $lte: 0 },
    });
  }

  if (andParts.length) {
    filter.$and = andParts;
  }
}

/**
 * Direct Mongo product query for SSR (avoids self-HTTP to /api/products).
 * Pass `listing` (from parseListingSearchParams) for shop URL filters.
 */
export async function fetchProductsServer(params = {}) {
  try {
    await dbConnect();
    const listing =
      params.listing ||
      (params.searchParams ? parseListingSearchParams(params.searchParams) : null);
    const limit = listing
      ? Math.min(48, Math.max(1, listing.pageSize))
      : Math.min(48, Math.max(1, Number(params.limit) || 12));
    const page = listing ? listing.page : Math.max(1, Number(params.page) || 1);
    const skip = (page - 1) * limit;
    const q = listing ? listing.q : String(params.q || "").trim();

    const filter = { status: "active" };
    if (listing) {
      await applyShopListingFilters(filter, listing);
    }

    let sortSpec = { createdAt: -1 };
    if (listing) {
      sortSpec = listingMongoSortSpec(listing.sort);
    } else {
      const sort = String(params.sort || "newest");
      if (sort === "popular" || sort === "bestselling") {
        sortSpec = { featured: -1, "inventory.quantity": -1, createdAt: -1 };
      } else if (sort === "price-asc") {
        sortSpec = { "pricing.regularPrice": 1 };
      } else if (sort === "price-desc") {
        sortSpec = { "pricing.regularPrice": -1 };
      } else if (sort === listingSortToApi("rating")) {
        sortSpec = listingMongoSortSpec("rating");
      }
    }

    const { rows, total } = await queryProductsWithSearch(Product, filter, q, {
      limit,
      skip,
      sortSpec,
      select: PRODUCT_CARD_SELECT,
      populate: "categories",
    });

    return {
      products: rows.map(serializeStoreProductSummary),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      query: q,
    };
  } catch (e) {
    console.error("fetchProductsServer error:", e);
    return { products: [], total: 0, page: 1, totalPages: 1, query: "" };
  }
}
