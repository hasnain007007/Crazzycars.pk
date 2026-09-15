import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { productMatchesVehicle, vehicleMatchScore } from "@/lib/vehicleCompatibility";
import { buildMakeModelProductOr } from "@/lib/productVehicleQuery";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

/** GET /api/products/fitment?make=Toyota&model=Yaris&year=2022&variant=GLI */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const make = (searchParams.get("make") || searchParams.get("carMake") || "").trim();
    const model = (searchParams.get("model") || searchParams.get("carModel") || "").trim();
    const yearRaw = searchParams.get("year") || searchParams.get("carYear") || "";
    const year = yearRaw !== "" ? Number(yearRaw) : null;
    const variant = (searchParams.get("variant") || "").trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 48));

    if (!make) {
      return NextResponse.json(
        { success: false, error: "Query parameter make is required." },
        { status: 400 }
      );
    }

    // Explicit vehicle links (+ legacy specific/semi-universal fitment). Universal is not auto-included.
    const { $or: orClauses, vehicleIds } = await buildMakeModelProductOr(make, model, year);
    const vehicleIdSet = new Set((vehicleIds || []).map((id) => String(id)));

    const candidates = await Product.find({
      ...STOREFRONT_PRODUCT_FILTER,
      $or: orClauses,
    })
      .select(
        "name slug media.images pricing inventory status featured newArrival categories vehicleCompatibility isUniversal compatibleCars compatibleVehicles rating reviewCount createdAt shortDescription tags brand vendor"
      )
      .populate("categories", "name slug")
      .sort({ featured: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const products = candidates
      .filter((p) => {
        // Only trust ObjectId links that match this make/model/year query set.
        const linkedToQueryVehicle = (p.compatibleVehicles || []).some((id) =>
          vehicleIdSet.has(String(id))
        );
        if (linkedToQueryVehicle) {
          // Year already scoped via Vehicle docs; still honor variant notes when present.
          if (!variant) return true;
          return productMatchesVehicle(p, make, model, year, variant);
        }

        // Legacy / string fitment must pass year + variant checks (specific/semi only).
        if (p.isUniversal || p.vehicleCompatibility?.fitmentType === "universal") {
          return false;
        }
        return productMatchesVehicle(p, make, model, year, variant);
      })
      .map((p) => ({
        product: serializeStoreProductSummary(p),
        score: vehicleMatchScore(p, make, model, year, variant),
      }))
      .sort((a, b) => b.score - a.score || (b.product.featured ? 1 : 0) - (a.product.featured ? 1 : 0))
      .slice(0, limit)
      .map((row) => row.product);

    return NextResponse.json(
      {
        success: true,
        make,
        model: model || null,
        year: year != null && Number.isFinite(year) ? year : null,
        variant: variant || null,
        count: products.length,
        products,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load fitment products." },
      { status: 500 }
    );
  }
}
