/**
 * GET /api/mobile/v1/products/[slug]
 * Optional query: vehicle=<slug> → adds fitsVehicle (web /cars filter parity) and
 * fitment: "exact" | "universal" | "none" for the garage fit badge.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { fitmentLabels } from "@/lib/mobile/fitsVehicle";
import { ANY_SEGMENT } from "@/lib/segment";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const slug = (await context.params).slug;
  if (!slug) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Missing slug." } },
      { status: 400 }
    );
  }
  try {
    await dbConnect();
    const p = await Product.findOne({ slug: String(slug), ...STOREFRONT_PRODUCT_FILTER })
      .select(
        "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns recommendedProducts customSizing specifications isUniversal compatibleCars vehicleCompatibility compatibleVehicles rating averageRating ratingAverage reviewCount totalReviews numReviews codEnabled isBulky advancePercentRequired"
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
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Product not found." } },
        { status: 404 }
      );
    }

    const detail = serializeStoreProductDetail(p);
    const vehicleSlug = new URL(request.url).searchParams.get("vehicle");
    if (vehicleSlug && String(vehicleSlug).trim()) {
      const vehicle = await Vehicle.findOne({
        slug: String(vehicleSlug).trim().toLowerCase(),
        ...ANY_SEGMENT,
      }).lean();
      const fitment = vehicle ? (await fitmentLabels([p], vehicle)).get(String(p._id)) : "none";
      detail.fitment = fitment || "none";
      detail.fitsVehicle = detail.fitment === "exact";
    }

    return NextResponse.json({ product: detail });
  } catch (err) {
    console.error("[mobile/products/[slug]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load product." } },
      { status: 500 }
    );
  }
}
