import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Review from "@/lib/models/Review.model";

const EMPTY_BREAKDOWN = [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percentage: 0 }));

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const productParam = searchParams.get("product");
    const productSlug = searchParams.get("slug");
    const featured = searchParams.get("featured");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 10));

    // Public API: always approved only (?status=approved in URLs for clarity; never expose pending/rejected).
    const query = { status: "approved" };

    if (productParam) {
      const raw = String(productParam).trim();
      if (mongoose.Types.ObjectId.isValid(raw)) {
        query.product = raw;
      } else {
        const prod = await Product.findOne({ slug: raw }).select("_id").lean();
        if (!prod) {
          return NextResponse.json({
            success: true,
            reviews: [],
            total: 0,
            stats: { total: 0, average: 0, breakdown: EMPTY_BREAKDOWN },
          });
        }
        query.product = prod._id;
      }
    } else if (productSlug) {
      query.productSlug = String(productSlug).trim();
    }
    if (featured === "true") {
      query.featured = true;
    }

    const reviews = await Review.find(query)
      .select("-reviewer.email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const allReviews = await Review.find(query).select("rating").lean();
    const totalCount = allReviews.length;
    const avgRating = totalCount > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount : 0;

    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
      const count = allReviews.filter((r) => r.rating === star).length;
      return {
        star,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      reviews,
      total: reviews.length,
      stats: {
        total: totalCount,
        average: Math.round(avgRating * 10) / 10,
        breakdown: ratingBreakdown,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load reviews" }, { status: 500 });
  }
}
