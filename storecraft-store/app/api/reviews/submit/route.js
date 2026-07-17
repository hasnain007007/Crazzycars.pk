import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Review from "@/lib/models/Review.model";
import Product from "@/lib/models/Product.model";

async function recalcProductRating(productId) {
  try {
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) return;
    await dbConnect();
    const reviews = await Review.find({ product: productId, status: "approved" }).select("rating").lean();
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

    const created = await Review.create({
      product: product._id,
      productName: product.name || "",
      productSlug: product.slug || "",
      reviewer: {
        name: name.trim(),
        email: email?.trim() || "",
        location: location?.trim() || "",
        verified: false,
      },
      rating: ratingNum,
      title: title?.trim() || "",
      body: reviewBody.trim(),
      status: "pending",
      source: "customer",
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
