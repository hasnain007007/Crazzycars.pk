import { NextResponse } from "next/server";
import Product from "@/lib/models/Product.model";
import { dbConnect } from "@/lib/db";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgFindProductBySlug } from "@/lib/pg/catalog";

export async function GET(_request, context) {
  try {
    const slug = (await context.params).slug;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Missing slug." }, { status: 400 });
    }
    if (isPostgresCatalog()) {
      const mapped = await pgFindProductBySlug(String(slug));
      if (!mapped) {
        return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: serializeStoreProductDetail(mapped) });
    }
    await dbConnect();
    const p = await Product.findOne({ slug: String(slug), status: { $regex: /^active$/i } })
      .select(
        "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns customSizing specifications isUniversal compatibleCars vehicleCompatibility rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .populate("categories", "name slug")
      .lean();
    if (!p) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: serializeStoreProductDetail(p) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load product." }, { status: 500 });
  }
}
