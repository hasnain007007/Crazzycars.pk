import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import BlogPost from "@/lib/models/BlogPost.model";
import { slugify } from "@/lib/slugify";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || "post";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await BlogPost.findOne(q).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 2}`;
  }
  throw new Error("Could not allocate slug.");
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "all").trim();
    const search = (searchParams.get("search") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (["published", "draft", "scheduled"].includes(status)) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };
    if (category) filter.categories = category;

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(filter),
    ]);
    return NextResponse.json({
      success: true,
      posts,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load posts." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
    }
    let slug = await uniqueSlug(body.slug || title, null);
    const exists = await BlogPost.findOne({ slug }).select("_id").lean();
    if (exists) slug = `${slug}-${Date.now()}`;

    const content = sanitizeBlogHtml(String(body.content || ""));
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const status = ["published", "draft", "scheduled"].includes(body.status) ? body.status : "draft";
    const doc = await BlogPost.create({
      title,
      slug,
      excerpt: String(body.excerpt || ""),
      content,
      featuredImage: {
        url: String(body.featuredImage?.url || ""),
        publicId: String(body.featuredImage?.publicId || ""),
        altText: String(body.featuredImage?.altText || ""),
      },
      author: {
        name: String(body.author?.name || user.name || "Admin"),
        avatar: String(body.author?.avatar || ""),
        bio: String(body.author?.bio || ""),
      },
      categories: Array.isArray(body.categories) ? body.categories.map((c) => String(c).trim()).filter(Boolean) : [],
      tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [],
      status,
      publishedAt: status === "published" ? new Date() : body.publishedAt ? new Date(body.publishedAt) : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      readTime,
      views: Number(body.views || 0),
      seo: {
        metaTitle: String(body.seo?.metaTitle || "").trim(),
        metaDescription: String(body.seo?.metaDescription || "").trim(),
        metaKeywords: Array.isArray(body.seo?.metaKeywords)
          ? body.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
          : [],
      },
      allowComments: body.allowComments !== false,
      isFeatured: Boolean(body.isFeatured),
      relatedProducts: Array.isArray(body.relatedProducts) ? body.relatedProducts : [],
    });
    return NextResponse.json({ success: true, post: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
