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

async function updateProductRating(productId) {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) return;
    const reviews = await Review.find({ product: productId, status: "approved" }).select("rating").lean();
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount
        : 0;
    const rounded = Math.round(averageRating * 10) / 10;

    await Product.findByIdAndUpdate(productId, {
      $set: {
        rating: rounded,
        averageRating: rounded,
        reviewCount,
        numReviews: reviewCount,
        totalReviews: reviewCount,
      },
    });
  } catch (e) {
    console.error("Error updating product rating:", e);
  }
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await dbConnect();
    const review = await Review.findById(id).populate("product", "name slug media").lean();
    if (!review) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, review });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function sanitizeUpdate(body) {
  const patch = {};
  if (body.reviewer && typeof body.reviewer === "object") {
    const nm = String(body.reviewer.name ?? "").trim();
    if (nm) {
      patch.reviewer = {
        name: nm,
        email: String(body.reviewer.email ?? "").trim(),
        location: String(body.reviewer.location ?? "").trim(),
        avatar: String(body.reviewer.avatar ?? "").trim(),
        verified: Boolean(body.reviewer.verified),
      };
    }
  }
  if (body.rating != null) {
    const r = Number(body.rating);
    if (Number.isFinite(r) && r >= 1 && r <= 5) patch.rating = r;
  }
  if (body.title != null) patch.title = String(body.title).trim();
  if (body.body != null) patch.body = String(body.body).trim();
  if (Array.isArray(body.images)) patch.images = body.images;
  if (body.status === "pending" || body.status === "approved" || body.status === "rejected") {
    patch.status = body.status;
  }
  if (body.featured != null) patch.featured = Boolean(body.featured);
  if (body.helpfulVotes != null && Number.isFinite(Number(body.helpfulVotes))) {
    patch.helpfulVotes = Math.max(0, Number(body.helpfulVotes));
  }
  if (body.orderId != null) patch.orderId = String(body.orderId).trim();
  if (body.adminReply != null && typeof body.adminReply === "object") {
    const text = String(body.adminReply.text || "").trim();
    patch.adminReply = {
      text,
      repliedAt: text ? body.adminReply.repliedAt || new Date() : undefined,
    };
  }
  if (body.product != null && mongoose.Types.ObjectId.isValid(String(body.product))) {
    patch.product = body.product;
  }
  if (body.source === "manual" || body.source === "import" || body.source === "customer") {
    patch.source = body.source;
  }
  return patch;
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await dbConnect();
    const existing = await Review.findById(id).lean();
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const patch = sanitizeUpdate(body);

    const $set = { ...patch };
    if (patch.product) {
      const p = await Product.findById(patch.product).select("name slug").lean();
      if (!p) return NextResponse.json({ success: false, error: "Product not found" }, { status: 400 });
      $set.productName = p.name || "";
      $set.productSlug = p.slug || "";
    }

    await Review.findByIdAndUpdate(id, { $set }, { runValidators: true });

    const review = await Review.findById(id).populate("product", "name slug media").lean();
    const effectiveProductId = patch.product || existing.product;
    const statusChanged = Object.prototype.hasOwnProperty.call(patch, "status");
    if ((statusChanged || patch.featured !== undefined || patch.rating != null) && effectiveProductId) {
      await updateProductRating(effectiveProductId);
    }

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: "Review updated",
      resource: "Review",
      resourceId: id,
      type: "update",
      ip: requestIp(request),
    });

    const revalidated = await revalidateStorefront(REVIEW_REVALIDATE_PATHS);
    return NextResponse.json({ success: true, review, revalidated });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await dbConnect();
    const doc = await Review.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const productId = doc.product;
    await Review.deleteOne({ _id: id });
    if (productId) {
      await updateProductRating(productId);
    }

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: "Review deleted",
      resource: "Review",
      resourceId: id,
      type: "delete",
      ip: requestIp(request),
    });

    const revalidated = await revalidateStorefront(REVIEW_REVALIDATE_PATHS);
    return NextResponse.json({ success: true, revalidated });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Delete failed" }, { status: 500 });
  }
}
