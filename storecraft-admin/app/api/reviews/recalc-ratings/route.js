import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Product from "@/lib/models/Product.model";
import Review from "@/lib/models/Review.model";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    await dbConnect();
    const products = await Product.find({}).select("_id").lean();

    let updated = 0;
    for (const product of products) {
      const reviews = await Review.find({
        product: product._id,
        status: "approved",
      })
        .select("rating")
        .lean();

      const count = reviews.length;
      const avg = count > 0 ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
      const rounded = Math.round(avg * 10) / 10;

      await Product.findByIdAndUpdate(product._id, {
        $set: {
          rating: rounded,
          averageRating: rounded,
          reviewCount: count,
          numReviews: count,
          totalReviews: count,
        },
      });

      if (count > 0) updated += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ratings for ${updated} products`,
      total: products.length,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
