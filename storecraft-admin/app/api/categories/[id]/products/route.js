/**
 * Manage products assigned to a category (membership via Product.categories).
 * GET  — list products in this category
 * POST — add product { productId }
 * DELETE — remove product ?productId=
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { withProductSaleComputed } from "@/lib/productSale";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid category id." }, { status: 400 });
    }

    await dbConnect();
    const category = await Category.findById(id).select("_id name slug").lean();
    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const search = (searchParams.get("search") || "").trim();

    const filter = { categories: id };
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$and = [{ $or: [{ name: rx }, { articleNo: rx }, { "inventory.sku": rx }] }];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .select("name slug status media pricing inventory articleNo categories createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      category: { _id: category._id, name: category.name, slug: category.slug },
      products: items.map(withProductSaleComputed),
      data: items.map(withProductSaleComputed),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list category products." },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid category id." }, { status: 400 });
    }

    const body = await request.json();
    const rawIds = Array.isArray(body.productIds)
      ? body.productIds
      : body.productId
        ? [body.productId]
        : [];
    const productIds = [
      ...new Set(
        rawIds
          .map((id) => String(id || "").trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    if (!productIds.length) {
      return NextResponse.json(
        { success: false, error: "Provide productId or productIds[]." },
        { status: 400 }
      );
    }

    await dbConnect();
    const category = await Category.findById(id).select("_id").lean();
    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    const catOid = new mongoose.Types.ObjectId(id);
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { categories: catOid } }
    );

    return NextResponse.json({
      success: true,
      message:
        productIds.length === 1
          ? "Product added to category."
          : `${productIds.length} products added to category.`,
      productIds,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid category id." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let productId = (searchParams.get("productId") || "").trim();
    if (!productId) {
      try {
        const body = await request.json();
        productId = String(body.productId || "").trim();
      } catch {
        /* no body */
      }
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, error: "Valid productId is required." }, { status: 400 });
    }

    await dbConnect();
    const product = await Product.findById(productId).select("_id categories");
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    product.categories = (product.categories || []).filter((c) => String(c) !== id);
    await product.save();

    return NextResponse.json({
      success: true,
      message: "Product removed from category.",
      productId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove product." },
      { status: 500 }
    );
  }
}
