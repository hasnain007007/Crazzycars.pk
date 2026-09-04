import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Product from "@/lib/models/Product.model";
import Review from "@/lib/models/Review.model";
import { requestIp } from "@/lib/requestIp";
import { revalidateStorefront } from "@/lib/revalidateStorefront";

const REVIEW_REVALIDATE_PATHS = ["/", "/api/reviews", "/api/products"];

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const productParam = searchParams.get("product");
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (status !== "all") query.status = status;
    if (productParam && mongoose.Types.ObjectId.isValid(productParam)) {
      query.product = productParam;
    }

    const [reviews, total, totalAll, pendingC, approvedC, rejectedC] = await Promise.all([
      Review.find(query).populate("product", "name slug media").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Review.countDocuments(query),
      Review.countDocuments({}),
      Review.countDocuments({ status: "pending" }),
      Review.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "rejected" }),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      reviews,
      total,
      page,
      pages,
      totalPages: pages,
      stats: { total: totalAll, pending: pendingC, approved: approvedC, rejected: rejectedC },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const pid = body.product;

    if (!pid || !mongoose.Types.ObjectId.isValid(String(pid))) {
      return NextResponse.json({ success: false, error: "Valid product is required" }, { status: 400 });
    }

    const product = await Product.findById(pid).select("name slug").lean();
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const reviewer = body.reviewer || {};
    const name = String(reviewer.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Reviewer name is required" }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be 1–5" }, { status: 400 });
    }

    const review = await Review.create({
      product: pid,
      productName: product.name || "",
      productSlug: product.slug || "",
      reviewer: {
        name,
        email: String(reviewer.email || "").trim(),
        location: String(reviewer.location || "").trim(),
        avatar: String(reviewer.avatar || "").trim(),
        verified: Boolean(reviewer.verified),
      },
      rating,
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      images: Array.isArray(body.images) ? body.images : [],
      status: ["pending", "approved", "rejected"].includes(body.status) ? body.status : "pending",
      featured: Boolean(body.featured),
      adminReply: {
        text: String(body.adminReply?.text || "").trim(),
        repliedAt: body.adminReply?.text ? body.adminReply?.repliedAt || new Date() : undefined,
      },
      source: "manual",
      helpfulVotes: Math.max(0, Number(body.helpfulVotes) || 0),
      orderId: String(body.orderId || "").trim(),
    });

    if (review.status === "approved") {
      const approved = await Review.find({ product: pid, status: "approved" }).select("rating").lean();
      const count = approved.length;
      const avg = count ? approved.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
      const rounded = Math.round(avg * 10) / 10;
      await Product.findByIdAndUpdate(pid, {
        $set: {
          rating: rounded,
          averageRating: rounded,
          reviewCount: count,
          numReviews: count,
          totalReviews: count,
        },
      });
    }

    const populated = await Review.findById(review._id).populate("product", "name slug media").lean();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: "Review created",
      resource: "Review",
      resourceId: String(review._id),
      type: "create",
      ip: requestIp(request),
    });

    const revalidated = await revalidateStorefront(REVIEW_REVALIDATE_PATHS);
    return NextResponse.json({ success: true, review: populated, revalidated });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Create failed" }, { status: 500 });
  }
}
