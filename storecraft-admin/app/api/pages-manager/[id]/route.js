import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Page from "@/lib/models/Page.model";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import { slugify } from "@/lib/slugify";
import { requestIp } from "@/lib/requestIp";

async function uniqueSlugExcluding(base, excludeId) {
  const root = slugify(base) || "page";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const exists = await Page.findOne({ slug, _id: { $ne: excludeId } }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 2}`;
  }
  throw new Error("Could not allocate slug.");
}

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Page.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, page: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load page." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
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
    const doc = await Page.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    const body = await request.json();

    if (body.title !== undefined) doc.title = String(body.title || "").trim();
    if (body.slug !== undefined) {
      const want = slugify(body.slug || doc.title);
      if (want && want !== doc.slug) {
        doc.slug = await uniqueSlugExcluding(want, doc._id);
      }
    }
    if (body.content !== undefined) doc.content = String(body.content || "");
    if (body.status !== undefined && ["draft", "published"].includes(body.status)) {
      doc.status = body.status;
    }
    if (body.seo !== undefined) {
      doc.seo = doc.seo || {};
      if (body.seo.metaTitle !== undefined) doc.seo.metaTitle = String(body.seo.metaTitle || "").trim();
      if (body.seo.metaDescription !== undefined) {
        doc.seo.metaDescription = String(body.seo.metaDescription || "").trim();
      }
      if (body.seo.metaKeywords !== undefined) {
        doc.seo.metaKeywords = normalizeMetaKeywords(body.seo.metaKeywords);
      }
    }
    if (body.showInFooter !== undefined) {
      doc.showInFooter = Boolean(body.showInFooter);
    }

    await doc.save();
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Page updated: ${doc.title}`,
      resource: "Page",
      resourceId: id,
      type: "update",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, page: doc.toObject() });
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
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Page.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await Page.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Page deleted: ${doc.title}`,
      resource: "Page",
      resourceId: id,
      type: "delete",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
