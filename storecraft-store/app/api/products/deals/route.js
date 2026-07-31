import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { buildDealsMongoFilter } from "@/lib/dealsFilter";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = String(searchParams.get("filter") || "all").toLowerCase();
    const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") || 12)));
    const query = {
      status: { $regex: /^active$/i },
      pricing: { $exists: true },
      ...buildDealsMongoFilter(filter),
    };
    const rows = await Product.find(query)
      .select(
        "name slug media.images pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit)
      .populate("categories", "name slug")
      .lean();

    return NextResponse.json(
      { success: true, products: rows.map(serializeStoreProductSummary) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load deals." }, { status: 500 });
  }
}
