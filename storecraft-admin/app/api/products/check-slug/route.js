import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Product from "@/lib/models/Product.model";
import { slugify } from "@/lib/slugify";

async function getUniqueSlug(base, excludeId) {
  const root = slugify(base || "product") || "product";
  let slug = root;
  let n = 1;
  while (true) {
    const q = { slug };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) q._id = { $ne: excludeId };
    const exists = await Product.findOne(q).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${n}`;
    n += 1;
  }
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "";
    const excludeId = searchParams.get("excludeId") || searchParams.get("id") || "";
    const normalized = slugify(slug);
    if (!normalized) {
      return NextResponse.json({ success: true, available: false, suggestion: "product" });
    }
    const suggestion = await getUniqueSlug(normalized, excludeId);
    return NextResponse.json({
      success: true,
      available: suggestion === normalized,
      suggestion,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check slug." },
      { status: 500 }
    );
  }
}
