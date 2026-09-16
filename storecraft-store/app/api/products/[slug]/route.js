import { NextResponse } from "next/server";
import Product from "@/lib/models/Product.model";
import { dbConnect } from "@/lib/db";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export async function GET(_request, context) {
  try {
    const slug = (await context.params).slug;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Missing slug." }, { status: 400 });
    }
    await dbConnect();
    const p = await Product.findOne({ slug: String(slug), ...STOREFRONT_PRODUCT_FILTER })
      .select(
        "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns recommendedProducts customSizing specifications isUniversal compatibleCars vehicleCompatibility rating averageRating ratingAverage reviewCount totalReviews numReviews codEnabled isBulky advancePercentRequired"
      )
      .populate("categories", "name slug")
      .populate({
        path: "recommendedProducts",
        match: { ...STOREFRONT_PRODUCT_FILTER },
        select:
          "name slug status media pricing inventory featured newArrival categories articleNo simpleVariations variationCombinations tags shortDescription",
      })
      .lean();
    if (!p) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: serializeStoreProductDetail(p) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load product." }, { status: 500 });
  }
}
