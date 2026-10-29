/**
 * GET /api/mobile/v1/products
 * Query: q, category, sort, page, limit, vehicle, brand, inStock, maxPrice, minPrice, fitsOnly, fit, segment
 *
 * Fitment design:
 * - `vehicle=<slug>` resolves a Vehicle, applies `buildVehiclePageProductFilter` (same as
 *   website `/cars/[slug]`), and sets `fitsVehicle: true` on every card.
 * - `fitsOnly=true` is the default when `vehicle` is set; pass `fitsOnly=false` only if
 *   you want unfiltered results (no fitsVehicle annotation in that mode for v1).
 * - `fit=specific|universal|all` (garage tabs): exact-fit only (default), universal parts only,
 *   or both. Every card then carries `fitment: "exact" | "universal" | "none"`.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { FIT_SCOPES, fitScopeFilter, fitmentLabels } from "@/lib/mobile/fitsVehicle";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { ACTIVE_STATUS, getActiveDescendantCategoryIds } from "@/lib/storeCategoryData";
import { ANY_SEGMENT, parseSegment, segmentFilter, segmentOf } from "@/lib/segment";

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
    const fitsOnlyParam = searchParams.get("fitsOnly");
    const fitsOnly =
      fitsOnlyParam == null || fitsOnlyParam === ""
        ? Boolean(vehicleSlug)
        : fitsOnlyParam === "true" || fitsOnlyParam === "1";
    const fitParam = (searchParams.get("fit") || "").trim().toLowerCase();
    const fitScope = FIT_SCOPES.includes(fitParam) ? fitParam : "specific";

    const filter = { ...STOREFRONT_PRODUCT_FILTER };
    let vehicleDoc = null;
    // A vehicle pins the store to its own segment; otherwise honour ?segment= (no param = all, as before).
    let segment = parseSegment(searchParams.get("segment"));

    if (categorySlug) {
      // Same scope as the website category page: the category plus every active sub-category.
      const cat = await Category.findOne({ slug: categorySlug, status: ACTIVE_STATUS })
        .select("_id")
        .lean();
      if (cat) {
        const allIds = [cat._id, ...(await getActiveDescendantCategoryIds(cat._id))];
        filter.$and = [
          ...(filter.$and || []),
          { $or: [{ categories: { $in: allIds } }, { category: { $in: allIds } }] },
        ];
      } else {
        filter._id = null;
      }
    }

    if (vehicleSlug) {
      vehicleDoc = await Vehicle.findOne({ slug: vehicleSlug, ...ANY_SEGMENT }).lean();
      if (vehicleDoc) segment = segmentOf(vehicleDoc);
      if (vehicleDoc && fitsOnly) {
        Object.assign(filter, fitScopeFilter(vehicleDoc, fitScope));
      } else if (!vehicleDoc && fitsOnly) {
        filter._id = null;
      }
    }

    Object.assign(filter, segmentFilter(segment));

    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      const textOr = [{ name: re }, { slug: re }, { articleNo: re }];
      if (filter.$or) {
        filter.$and = [...(filter.$and || []), { $or: filter.$or }, { $or: textOr }];
        delete filter.$or;
      } else {
        filter.$or = textOr;
      }
    }

    if (brand) {
      filter.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
    }

    const priceFilter = {};
    if (maxPriceRaw) priceFilter.$lte = Number(maxPriceRaw);
    if (minPriceRaw) priceFilter.$gte = Number(minPriceRaw);
    if (Object.keys(priceFilter).length) {
      filter["pricing.regularPrice"] = priceFilter;
    }

    if (inStockOnly) {
      filter["inventory.quantity"] = { $gt: 0 };
    }

    let sortSpec = { createdAt: -1 };
    if (sort === "price-asc" || sort === "price_asc") sortSpec = { "pricing.regularPrice": 1 };
    else if (sort === "price-desc" || sort === "price_desc") sortSpec = { "pricing.regularPrice": -1 };
    else if (sort === "popular" || sort === "name") {
      sortSpec = sort === "name" ? { name: 1 } : { reviewCount: -1, createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(
          "name slug articleNo media pricing inventory status categories featured newArrival simpleVariations variationCombinations codEnabled isBulky shortDescription isUniversal vehicleCompatibility.fitmentType"
        )
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const labels = vehicleDoc ? await fitmentLabels(products, vehicleDoc) : null;
    const data = products.map((p) => {
      const summary = serializeStoreProductSummary(p);
      if (!labels) return summary;
      const fitment = labels.get(String(p._id)) || "none";
      return { ...summary, fitment, fitsVehicle: fitment === "exact" };
    });

    return NextResponse.json({
      products: data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 0,
        hasNext: page * limit < total,
      },
      vehicle: vehicleDoc
        ? {
            id: String(vehicleDoc._id),
            slug: vehicleDoc.slug,
            make: vehicleDoc.make,
            model: vehicleDoc.model,
            generation: vehicleDoc.generation || "",
          }
        : null,
    });
  } catch (err) {
    console.error("[mobile/products]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load products." } },
      { status: 500 }
    );
  }
}
