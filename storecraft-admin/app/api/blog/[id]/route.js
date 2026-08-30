import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import BlogPost from "@/lib/models/BlogPost.model";
import { slugify } from "@/lib/slugify";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";

async function uniqueSlugExcluding(base, excludeId) {
  const root = slugify(base) || "post";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const exists = await BlogPost.findOne({ slug, _id: { $ne: excludeId } }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 2}`;
  }
  throw new Error("Could not allocate slug.");
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
    const doc = await BlogPost.findById(id).populate("relatedProducts").lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, post: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load post." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await BlogPost.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    const body = await request.json();
    const prevStatus = doc.status;

    if (body.title !== undefined) doc.title = String(body.title || "").trim();
    if (body.slug !== undefined) {
      const want = slugify(body.slug || doc.title);
      if (want && want !== doc.slug) {
        doc.slug = await uniqueSlugExcluding(want, doc._id);
      }
    }
    if (body.excerpt !== undefined) doc.excerpt = String(body.excerpt || "");
    if (body.content !== undefined) {
      doc.content = sanitizeBlogHtml(String(body.content || ""));
      const wordCount = doc.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      doc.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }
    if (body.featuredImage !== undefined) {
      doc.featuredImage = {
        url: String(body.featuredImage?.url || ""),
        publicId: String(body.featuredImage?.publicId || ""),
        altText: String(body.featuredImage?.altText || ""),
      };
    }
    if (body.status !== undefined && ["draft", "published", "scheduled"].includes(body.status)) {
      doc.status = body.status;
    }
    if (prevStatus !== "published" && doc.status === "published" && !doc.publishedAt) {
      doc.publishedAt = new Date();
    }
    if (body.publishedAt !== undefined) doc.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    if (body.scheduledAt !== undefined) doc.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.categories !== undefined) doc.categories = Array.isArray(body.categories) ? body.categories : [];
    if (body.tags !== undefined) doc.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.author !== undefined) {
      doc.author = {
        name: String(body.author?.name || ""),
        avatar: String(body.author?.avatar || ""),
        bio: String(body.author?.bio || ""),
      };
    }
    if (body.views !== undefined) doc.views = Number(body.views) || 0;
    if (body.allowComments !== undefined) doc.allowComments = Boolean(body.allowComments);
    if (body.isFeatured !== undefined) doc.isFeatured = Boolean(body.isFeatured);
    if (body.relatedProducts !== undefined) doc.relatedProducts = Array.isArray(body.relatedProducts) ? body.relatedProducts : [];
    if (body.seo !== undefined) {
      doc.seo = {
        metaTitle: String(body.seo?.metaTitle || ""),
        metaDescription: String(body.seo?.metaDescription || ""),
        metaKeywords: Array.isArray(body.seo?.metaKeywords)
          ? body.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
          : [],
      };
    }

    await doc.save();
    return NextResponse.json({ success: true, post: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await BlogPost.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await BlogPost.deleteOne({ _id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
