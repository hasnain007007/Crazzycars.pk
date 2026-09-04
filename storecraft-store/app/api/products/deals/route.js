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
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 500)));
    const query = {
      status: { $regex: /^active$/i },
      pricing: { $exists: true },
      ...buildDealsMongoFilter(filter),
    };
    const rows = await Product.find(query)
      .select(
        "name slug media.images pricing inventory featured isDeal newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate("categories", "name slug")
      .lean();

    return NextResponse.json(
      {
        success: true,
        products: rows.map(serializeStoreProductSummary),
        total: rows.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load deals." }, { status: 500 });
  }
}
