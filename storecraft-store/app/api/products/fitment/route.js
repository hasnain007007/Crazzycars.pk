import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { productMatchesVehicle, vehicleMatchScore } from "@/lib/vehicleCompatibility";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    const mkRx = new RegExp(`^${escapeRegex(make)}$`, "i");
    const mdRx = model ? new RegExp(escapeRegex(model), "i") : null;

    const orClauses = [
      { "vehicleCompatibility.fitmentType": "universal" },
      { isUniversal: true },
    ];

    if (model) {
      orClauses.push({
        "vehicleCompatibility.fitmentType": "specific",
        "vehicleCompatibility.vehicles": {
          $elemMatch: {
            make: mkRx,
            model: mdRx,
          },
        },
      });
      orClauses.push({
        compatibleCars: {
          $elemMatch: {
            make: mkRx,
            model: mdRx,
          },
        },
      });
    } else {
      orClauses.push({
        "vehicleCompatibility.vehicles": {
          $elemMatch: { make: mkRx },
        },
      });
      orClauses.push({
        compatibleCars: {
          $elemMatch: { make: mkRx },
        },
      });
    }

    const candidates = await Product.find({
      status: { $regex: /^active$/i },
      $or: orClauses,
    })
      .select(
        "name slug media pricing inventory status featured newArrival categories vehicleCompatibility isUniversal compatibleCars rating reviewCount createdAt shortDescription tags brand vendor"
      )
      .populate("categories", "name slug")
      .sort({ featured: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const products = candidates
      .filter((p) => productMatchesVehicle(p, make, model, year, variant))
      .map((p) => ({
        product: serializeStoreProductSummary(p),
        score: vehicleMatchScore(p, make, model, year, variant),
      }))
      .sort((a, b) => b.score - a.score || (b.product.featured ? 1 : 0) - (a.product.featured ? 1 : 0))
      .slice(0, limit)
      .map((row) => row.product);

    return NextResponse.json({
      success: true,
      make,
      model: model || null,
      year: year != null && Number.isFinite(year) ? year : null,
      variant: variant || null,
      count: products.length,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load fitment products." },
      { status: 500 }
    );
  }
}
