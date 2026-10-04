/**
 * GET /api/mobile/v1/catalog/products
 * Product listing with filtering. Supports vehicle slug via ?vehicle= query.
 * Query params: q, category, sort, page, limit, vehicle, brand, inStock, maxPrice, minPrice
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { buildMakeModelProductOr } from "@/lib/productVehicleQuery";

export const dynamic = "force-dynamic";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const categorySlug = (searchParams.get("category") || "").trim().toLowerCase();
    const vehicleSlug = (searchParams.get("vehicle") || "").trim().toLowerCase();
    const sort = (searchParams.get("sort") || "newest").trim();
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 24));
    const skip = (page - 1) * limit;
    const brand = (searchParams.get("brand") || "").trim();
    const inStockOnly = searchParams.get("inStock") === "true";
    const maxPriceRaw = searchParams.get("maxPrice");
    const minPriceRaw = searchParams.get("minPrice");

    const filter = { ...STOREFRONT_PRODUCT_FILTER };

    // Category filter
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug }).select("_id").lean();
      if (cat) filter.categories = cat._id;
    }

    // Vehicle slug filter
    if (vehicleSlug) {
      const vehicle = await Vehicle.findOne({ slug: vehicleSlug }).lean();
      if (vehicle) {
        const orClauses = buildMakeModelProductOr ? buildMakeModelProductOr({ make: vehicle.make, model: vehicle.model, generation: vehicle.generation }) : [];
        if (orClauses?.length) {
          filter.$or = orClauses;
        } else {
          filter.compatibleVehicles = vehicle._id;
        }
      }
    }

    // Text search
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = filter.$or
        ? [...filter.$or, { name: re }, { slug: re }]
        : [{ name: re }, { slug: re }, { articleNo: re }];
    }

    // Brand filter
    if (brand) {
      filter.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
    }

    // Price filter
    const priceFilter = {};
    if (maxPriceRaw) priceFilter.$lte = Number(maxPriceRaw);
    if (minPriceRaw) priceFilter.$gte = Number(minPriceRaw);
    if (Object.keys(priceFilter).length) {
      filter["pricing.regularPrice"] = priceFilter;
    }

    // Stock filter
    if (inStockOnly) {
      filter["inventory.quantity"] = { $gt: 0 };
    }

    // Sort
    let sortSpec = { createdAt: -1 };
    if (sort === "price-asc") sortSpec = { "pricing.regularPrice": 1 };
    else if (sort === "price-desc") sortSpec = { "pricing.regularPrice": -1 };
    else if (sort === "popular") sortSpec = { reviewCount: -1, createdAt: -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("name slug articleNo media pricing inventory status categories featured newArrival simpleVariations variationCombinations codEnabled isBulky shortDescription")
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const data = products.map((p) => serializeStoreProductSummary(p));

    return NextResponse.json({
      products: data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (err) {
    console.error("[mobile/catalog/products]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load products." } },
      { status: 500 }
    );
  }
}
