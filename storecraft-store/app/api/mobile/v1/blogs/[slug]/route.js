/**
 * GET /api/mobile/v1/blogs/:slug
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import "@/lib/models/Product.model";
import { sanitizeBlogHtml } from "@/lib/sanitizeHtml";
import { mobileError } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return mobileError("VALIDATION_ERROR", "Invalid slug.", { status: 400 });
    }

    const post = await BlogPost.findOneAndUpdate(
      { slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .select(
        "title slug excerpt content featuredImage publishedAt createdAt categories tags readTime views author relatedProducts seo"
      )
      .populate("relatedProducts", "name slug media pricing inventory")
      .lean();

    if (!post) {
      return mobileError("NOT_FOUND", "Post not found.", { status: 404 });
    }

    return NextResponse.json({
      post: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: sanitizeBlogHtml(post.content),
        featuredImage: post.featuredImage || { url: "", altText: "" },
        publishedAt: post.publishedAt || post.createdAt,
        categories: post.categories || [],
        tags: post.tags || [],
        readTime: post.readTime || 1,
        views: post.views || 0,
        author: post.author || { name: "" },
        relatedProducts: (post.relatedProducts || []).map((p) => ({
          id: String(p._id),
          name: p.name,
          slug: p.slug,
        })),
        seo: post.seo || {},
      },
    });
  } catch (err) {
    console.error("[mobile/blogs/slug]", err);
    return mobileError("INTERNAL_ERROR", "Failed to load post.", { status: 500 });
  }
}
