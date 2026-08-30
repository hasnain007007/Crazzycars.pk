import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit"), 10) || 9));
    const skip = (page - 1) * limit;
    const category = (searchParams.get("category") || "").trim();
    const search = String(searchParams.get("search") || "").trim().slice(0, 120);
    const filter = { status: "published" };
    if (category) filter.categories = category;
    if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };
    const [rows, total] = await Promise.all([
      BlogPost.find(filter)
        .select(
          "title slug excerpt content featuredImage publishedAt createdAt categories tags readTime views isFeatured author status"
        )
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    const posts = rows.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      excerpt: String(p.excerpt || p.content || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160),
      featuredImage: p.featuredImage || { url: "", altText: "" },
      publishedAt: p.publishedAt || p.createdAt,
      categories: p.categories || [],
      tags: p.tags || [],
      readTime: p.readTime || 1,
      views: p.views || 0,
      isFeatured: Boolean(p.isFeatured),
      author: p.author || { name: "" },
    }));

    return NextResponse.json(
      {
        success: true,
        posts,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load blog." }, { status: 500 });
  }
}
