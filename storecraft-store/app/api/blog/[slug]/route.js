import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import "@/lib/models/Product.model";

/**
 * Public blog post by slug (no auth). Increments views for published posts only.
 */
export async function GET(_request, context) {
  try {
    await dbConnect();

    const params = await context.params;
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ success: false, error: "Invalid slug." }, { status: 400 });
    }

    const post = await BlogPost.findOneAndUpdate(
      { slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .select(
        "title slug excerpt content featuredImage publishedAt createdAt categories tags readTime views author relatedProducts seo status"
      )
      .populate("relatedProducts", "name slug media pricing inventory")
      .lean();

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        post: {
          id: post._id.toString(),
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || "",
          content: post.content || "",
          featuredImage: post.featuredImage || { url: "", altText: "" },
          publishedAt: post.publishedAt || post.createdAt,
          categories: post.categories || [],
          tags: post.tags || [],
          readTime: post.readTime || 1,
          views: post.views || 0,
          author: post.author || { name: "" },
          relatedProducts: post.relatedProducts || [],
          seo: post.seo || {},
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load post." }, { status: 500 });
  }
}
