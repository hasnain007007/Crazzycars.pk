/**
 * Adjacent products for edit-page Previous / Next (same order as catalog list: createdAt desc).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Product from "@/lib/models/Product.model";

function serializeNeighbor(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name || "",
    articleNo: doc.articleNo || "",
  };
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }

    await dbConnect();
    const current = await Product.findById(id).select("_id name createdAt").lean();
    if (!current) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    // Catalog list sorts createdAt: -1 (newest first).
    // Previous = newer (toward start of list). Next = older (toward end of list).
    const [previous, next] = await Promise.all([
      Product.findOne({
        createdAt: { $gt: current.createdAt },
        _id: { $ne: current._id },
      })
        .sort({ createdAt: 1 })
        .select("_id name articleNo")
        .lean(),
      Product.findOne({
        createdAt: { $lt: current.createdAt },
        _id: { $ne: current._id },
      })
        .sort({ createdAt: -1 })
        .select("_id name articleNo")
        .lean(),
    ]);

    // Tie-break on identical createdAt using _id
    let prevDoc = previous;
    let nextDoc = next;
    if (!prevDoc) {
      prevDoc = await Product.findOne({
        createdAt: current.createdAt,
        _id: { $gt: current._id },
      })
        .sort({ _id: 1 })
        .select("_id name articleNo")
        .lean();
    }
    if (!nextDoc) {
      nextDoc = await Product.findOne({
        createdAt: current.createdAt,
        _id: { $lt: current._id },
      })
        .sort({ _id: -1 })
        .select("_id name articleNo")
        .lean();
    }

    return NextResponse.json({
      success: true,
      previous: serializeNeighbor(prevDoc),
      next: serializeNeighbor(nextDoc),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load neighbors." },
      { status: 500 }
    );
  }
}
