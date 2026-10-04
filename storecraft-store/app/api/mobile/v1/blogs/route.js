/**
 * GET /api/mobile/v1/catalog/blogs
 * Blog listing. Query: page, limit, category, search
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";

export const dynamic = "force-dynamic";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit"), 10) || 12));
    const skip = (page - 1) * limit;
    const category = (searchParams.get("category") || "").trim();
    const search = String(searchParams.get("search") || "").trim().slice(0, 120);

    const filter = { status: "published" };
    if (category) filter.categories = category;
    if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };

    const [rows, total] = await Promise.all([
      BlogPost.find(filter)
        .select("title slug excerpt featuredImage publishedAt createdAt categories tags readTime views isFeatured author")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    const posts = rows.map((p) => ({
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      excerpt: String(p.excerpt || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
      image: p.featuredImage || "",
      publishedAt: p.publishedAt || p.createdAt,
      readTime: p.readTime || null,
      categories: Array.isArray(p.categories) ? p.categories : [],
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 10) : [],
      views: p.views || 0,
    }));

    return NextResponse.json({
      posts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[mobile/catalog/blogs]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load blogs." } }, { status: 500 });
  }
}
