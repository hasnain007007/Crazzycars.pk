import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { queryProductsWithSearch } from "@/lib/productSearch";

/** Fields needed for product cards / homepage grids. */
export const PRODUCT_CARD_SELECT =
  "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags compatibleCars vehicleCompatibility";

/**
 * Direct Mongo product query for SSR (avoids self-HTTP to /api/products).
 * @param {{ limit?: number, sort?: string, page?: number, q?: string }} params
 */
export async function fetchProductsServer(params = {}) {
  try {
    await dbConnect();
    const limit = Math.min(48, Math.max(1, Number(params.limit) || 12));
    const page = Math.max(1, Number(params.page) || 1);
    const skip = (page - 1) * limit;
    const sort = String(params.sort || "newest");
    const q = String(params.q || "").trim();

    const filter = { status: { $regex: /^active$/i } };

    let sortSpec = { createdAt: -1 };
    if (sort === "popular" || sort === "bestselling") {
      sortSpec = { featured: -1, "inventory.quantity": -1, createdAt: -1 };
    } else if (sort === "price-asc") {
      sortSpec = { "pricing.regularPrice": 1 };
    } else if (sort === "price-desc") {
      sortSpec = { "pricing.regularPrice": -1 };
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
