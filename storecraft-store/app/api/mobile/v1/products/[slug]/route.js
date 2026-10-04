/**
 * GET /api/mobile/v1/catalog/products/[slug]
 * Single product detail.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const slug = (await context.params).slug;
  if (!slug) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing slug." } }, { status: 400 });
  }
  try {
    await dbConnect();
    const p = await Product.findOne({ slug: String(slug), ...STOREFRONT_PRODUCT_FILTER })
      .select(
        "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns recommendedProducts customSizing specifications isUniversal compatibleCars vehicleCompatibility rating averageRating ratingAverage reviewCount totalReviews numReviews codEnabled isBulky advancePercentRequired"
      )
      .populate("categories", "name slug")
      .populate({
        path: "recommendedProducts",
        match: { ...STOREFRONT_PRODUCT_FILTER },
        select: "name slug status media pricing inventory featured newArrival categories articleNo simpleVariations variationCombinations tags shortDescription",
      })
      .lean();

    if (!p) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Product not found." } }, { status: 404 });
    }
    return NextResponse.json({ product: serializeStoreProductDetail(p) });
  } catch (err) {
    console.error("[mobile/catalog/products/[slug]]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load product." } }, { status: 500 });
  }
}
