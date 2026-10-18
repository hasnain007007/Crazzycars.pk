import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  rateLimitResponse,
  recordActionAttempt,
} from "@/lib/actionRateLimit";
import { dbConnect } from "@/lib/db";
import Review from "@/lib/models/Review.model";
import Product from "@/lib/models/Product.model";
import Order from "@/lib/models/Order.model";
import { requestIp } from "@/lib/requestIp";
import { verifyReviewRequestToken } from "@/lib/reviewRequestToken";

const REVIEW_RATE = { maxAttempts: 3, windowMs: 60 * 60 * 1000 };

async function recalcProductRating(productId) {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) return;
    await dbConnect();
    const reviews = await Review.find({
      product: productId,
      status: "approved",
      isSeed: { $ne: true },
      orderId: { $exists: true, $nin: [null, ""] },
    })
      .select("rating")
      .lean();
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
    const rounded = Math.round(avg * 10) / 10;
    await Product.findByIdAndUpdate(productId, {
      $set: {
        rating: rounded,
        averageRating: rounded,
        reviewCount: count,
        numReviews: count,
        totalReviews: count,
      },
    });
  } catch {
    // non-blocking
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));

    const {
      productId,
      productSlug,
      name,
      email,
      location,
      rating,
      title,
      body: reviewBody,
      orderId,
      token,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({
        success: false,
        error: "Please enter your name",
      });
    }
    const ratingNum = parseInt(String(rating), 10);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({
        success: false,
        error: "Please select a rating",
      });
    }
    if (!reviewBody?.trim() || reviewBody.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please write at least 10 characters",
      });
    }
    if (!productId && !productSlug) {
      return NextResponse.json({
        success: false,
        error: "Product not found",
      });
    }

    let query = null;
    if (productId && mongoose.Types.ObjectId.isValid(String(productId))) {
      query = { _id: productId };
    } else if (productSlug) {
      query = { slug: String(productSlug).trim() };
    } else {
      return NextResponse.json({
        success: false,
        error: "Product not found",
      });
    }

    const product = await Product.findOne(query).select("name slug").lean();

    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Product not found",
      });
    }

    // Optional signed post-delivery link → schema-eligible once approved.
    let verifiedOrderId = "";
    const orderIdStr = String(orderId || "").trim();
    const tokenStr = String(token || "").trim();
    if (orderIdStr || tokenStr) {
      if (!orderIdStr || !tokenStr || !mongoose.Types.ObjectId.isValid(orderIdStr)) {
        return NextResponse.json(
          { success: false, error: "Invalid review link. Please use the WhatsApp link we sent." },
          { status: 400 }
        );
      }
      const tokenCheck = verifyReviewRequestToken(tokenStr, orderIdStr);
      if (!tokenCheck.ok) {
        return NextResponse.json({ success: false, error: tokenCheck.error }, { status: 400 });
      }
      const order = await Order.findById(orderIdStr).select("orderStatus items").lean();
      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }
      const orderStatus = String(order.orderStatus || "").toLowerCase();
      if (orderStatus && orderStatus !== "delivered" && orderStatus !== "completed") {
        return NextResponse.json(
          { success: false, error: "Reviews are only accepted after delivery." },
          { status: 400 }
        );
      }
      const lineHit = (order.items || []).some((it) => {
        const pid = it.product ? String(it.product) : "";
        const slug = String(it.slug || it.productSlug || "").trim();
        return (
          (pid && pid === String(product._id)) ||
          (slug && slug === String(product.slug || ""))
        );
      });
      if (!lineHit) {
        return NextResponse.json(
          { success: false, error: "That product is not on this order." },
          { status: 400 }
        );
      }
      const existing = await Review.findOne({
        product: product._id,
        orderId: orderIdStr,
        status: { $in: ["pending", "approved"] },
      })
        .select("_id")
        .lean();
      if (existing) {
        return NextResponse.json(
          { success: false, error: "You already reviewed this product for this order." },
          { status: 400 }
        );
      }
      verifiedOrderId = orderIdStr;
    }

    const reviewLimitKey = actionRateLimitKey(
      `review-submit:${String(product._id)}`,
      verifiedOrderId || String(email || "anon").trim().toLowerCase() || "anon",
      requestIp(req)
    );
    const reviewLimit = await checkActionRateLimit(reviewLimitKey, REVIEW_RATE);
    if (reviewLimit.limited) {
      return rateLimitResponse(
        reviewLimit.remainingMs,
        "Too many review submissions. Please try again later."
      );
    }
    await recordActionAttempt(reviewLimitKey, REVIEW_RATE);

    const created = await Review.create({
      product: product._id,
      productName: product.name || "",
      productSlug: product.slug || "",
      reviewer: {
        name: name.trim(),
        email: email?.trim() || "",
        location: location?.trim() || "",
        verified: Boolean(verifiedOrderId),
      },
      rating: ratingNum,
      title: title?.trim() || "",
      body: reviewBody.trim(),
      status: "pending",
      source: "customer",
      ...(verifiedOrderId ? { orderId: verifiedOrderId } : {}),
      isSeed: false,
    });
    recalcProductRating(created.product).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Thank you for your review! It will appear after approval.",
    });
  } catch (e) {
    console.error("Review submit error:", e);
    return NextResponse.json({ success: false, error: "Failed to submit review" }, { status: 500 });
  }
}
