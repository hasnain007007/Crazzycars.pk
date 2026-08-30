import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 12));
    const category = searchParams.get("category") || "";
    const search = String(searchParams.get("search") || "").trim().slice(0, 120);
    const skip = (page - 1) * limit;

    // Public API: never expose drafts / scheduled posts.
    const query = { status: "published" };
    if (category && category.toLowerCase() !== "all") {
      query.$or = [
        { categories: { $in: [category] } },
        { category },
      ];
    }
    if (search) {
      const rx = escapeRegex(search);
      const searchOr = [
        { title: { $regex: rx, $options: "i" } },
        { excerpt: { $regex: rx, $options: "i" } },
        { tags: { $in: [new RegExp(rx, "i")] } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const [posts, total, recentRaw, allPublishedForCategories] = await Promise.all([
      BlogPost.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title slug excerpt featuredImage image author categories category tags createdAt readTime status")
        .lean(),
      BlogPost.countDocuments(query),
      BlogPost.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title slug featuredImage image")
        .lean(),
      BlogPost.find({ status: "published" }).select("categories category").lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const normalizedPosts = posts.map((p) => ({
      ...p,
      id: p._id != null ? String(p._id) : undefined,
      featuredImage: p.featuredImage?.url
        ? p.featuredImage
        : p.image
          ? { url: p.image, altText: p.title || "" }
          : { url: "", altText: "" },
    }));
    const recentPosts = recentRaw.map((p) => ({
      ...p,
      featuredImage: p.featuredImage?.url
        ? p.featuredImage
        : p.image
          ? { url: p.image, altText: p.title || "" }
          : { url: "", altText: "" },
    }));

    const categorySet = new Set();
    for (const post of allPublishedForCategories || []) {
      if (Array.isArray(post?.categories)) {
        for (const c of post.categories) {
          if (typeof c === "string" && c.trim()) categorySet.add(c.trim());
        }
      }
      if (typeof post?.category === "string" && post.category.trim()) {
        categorySet.add(post.category.trim());
      }
    }

    return NextResponse.json(
      {
        success: true,
        posts: normalizedPosts,
        recentPosts,
        categories: Array.from(categorySet).sort((a, b) => a.localeCompare(b)),
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
