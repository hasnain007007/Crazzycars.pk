import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";

function dealsExpr(filter) {
  if (filter === "under1000") {
    return { $and: [{ $lt: ["$pricing.salePrice", 1000] }, { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] }] };
  }
  if (filter === "under700") {
    return { $and: [{ $lt: ["$pricing.salePrice", 700] }, { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] }] };
  }
  if (filter === "fiftyoff") {
    return {
      $and: [
        { $gt: ["$pricing.regularPrice", 0] },
        { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] },
        {
          $gte: [
            {
              $multiply: [
                { $divide: [{ $subtract: ["$pricing.regularPrice", "$pricing.salePrice"] }, "$pricing.regularPrice"] },
                100,
              ],
            },
            50,
          ],
        },
      ],
    };
  }
  if (filter === "flash") {
    return {
      $or: [
        { isFlashDeal: true },
        { isDeal: true },
        { tags: { $elemMatch: { $regex: /^flash$/i } } },
        { $expr: { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] } },
      ],
    };
  }
  return { $expr: { $gt: ["$pricing.regularPrice", "$pricing.salePrice"] } };
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = String(searchParams.get("filter") || "all").toLowerCase();
    const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") || 12)));
    const query = {
      status: { $regex: /^active$/i },
      pricing: { $exists: true },
      ...dealsExpr(filter),
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
