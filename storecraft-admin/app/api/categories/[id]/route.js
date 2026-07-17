import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlugExcludingId(base, excludeId) {
  const root = slugify(base) || "category";
  let slug = root;
  let index = 1;
  while (await Category.findOne({ slug, _id: { $ne: excludeId } }).select("_id").lean()) {
    slug = `${root}-${index}`;
    index += 1;
  }
  return slug;
}

async function collectDescendantIds(categoryId) {
  const descendants = [];
  let frontier = [String(categoryId)];
  while (frontier.length) {
    const children = await Category.find({
      parentCategory: { $in: frontier.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("_id")
      .lean();
    frontier = children.map((c) => String(c._id));
    descendants.push(...frontier);
  }
  return descendants;
}

async function refreshDescendants(parentId) {
  const parent = await Category.findById(parentId).select("_id level ancestors").lean();
  if (!parent) return;
  const children = await Category.find({ parentCategory: parentId }).select("_id").lean();
  for (const child of children) {
    const level = Number(parent.level || 0) + 1;
    const ancestors = [...(parent.ancestors || []), parent._id];
    await Category.updateOne({ _id: child._id }, { $set: { level, ancestors } });
    await refreshDescendants(child._id);
  }
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
    const doc = await Category.findById(id).populate("parentCategory", "name").lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, category: doc, data: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load category." },
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
    const existing = await Category.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body.name ?? existing.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    let parentCategory = existing.parentCategory ? String(existing.parentCategory) : null;
    let level = Number(existing.level || 0);
    let ancestors = Array.isArray(existing.ancestors) ? [...existing.ancestors] : [];

    if (body.parentCategory !== undefined) {
      if (body.parentCategory === null || body.parentCategory === "") {
        parentCategory = null;
        level = 0;
        ancestors = [];
      } else {
        if (!mongoose.Types.ObjectId.isValid(body.parentCategory)) {
          return NextResponse.json({ success: false, error: "Invalid parent category." }, { status: 400 });
        }
        if (String(body.parentCategory) === String(id)) {
          return NextResponse.json({ success: false, error: "Category cannot be its own ancestor." }, { status: 400 });
        }

        const descendants = await collectDescendantIds(id);
        if (descendants.includes(String(body.parentCategory))) {
          return NextResponse.json({ success: false, error: "Category cannot be its own ancestor." }, { status: 400 });
        }

        parentCategory = String(body.parentCategory);
        const parentDoc = await Category.findById(parentCategory).select("_id level ancestors").lean();
        if (!parentDoc) {
          return NextResponse.json({ success: false, error: "Parent category not found." }, { status: 400 });
        }
        level = Number(parentDoc.level || 0) + 1;
        ancestors = [...(Array.isArray(parentDoc.ancestors) ? parentDoc.ancestors : []), parentDoc._id];
      }
    }

    const slugInput = body.slug !== undefined && body.slug !== null ? String(body.slug).trim() : "";
    const baseSlug = slugInput || name;
    const slug = await uniqueSlugExcludingId(baseSlug || "category", existing._id);

    existing.name = name;
    existing.slug = slug;
    existing.description = String(body.description ?? existing.description ?? "");
    existing.parentCategory = parentCategory ? new mongoose.Types.ObjectId(parentCategory) : null;
    existing.level = level;
    existing.ancestors = ancestors;
    if (body.image !== undefined) {
      existing.image = {
        url: body.image?.url || "",
        publicId: body.image?.publicId || "",
        altText: body.image?.altText || "",
        title: body.image?.title || "",
      };
    }
    if (body.status !== undefined) {
      existing.status = ["active", "draft"].includes(body.status) ? body.status : existing.status;
    }
    if (body.featured !== undefined || body.isFeatured !== undefined) {
      const flag = Boolean(body.featured ?? body.isFeatured);
      existing.isFeatured = flag;
      existing.featured = flag;
    }
    if (body.showInNav !== undefined) existing.showInNav = Boolean(body.showInNav);
    if (body.showInFooter !== undefined) existing.showInFooter = Boolean(body.showInFooter);
    if (body.showOnHomepage !== undefined) existing.showOnHomepage = Boolean(body.showOnHomepage);
    if (body.homepageOrder !== undefined) existing.homepageOrder = Number(body.homepageOrder) || 0;
    if (body.homepageIcon !== undefined) existing.homepageIcon = String(body.homepageIcon || "");
    if (body.sortOrder !== undefined) {
      existing.sortOrder = Number(body.sortOrder) || 0;
    }
    if (body.seo !== undefined) {
      existing.seo = {
        metaTitle: String(body.seo?.metaTitle || ""),
        metaDescription: String(body.seo?.metaDescription || ""),
        metaKeywords: Array.isArray(body.seo?.metaKeywords)
          ? body.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
          : [],
      };
    }

    await existing.save();
    await refreshDescendants(existing._id);
    const updated = await Category.findById(existing._id).populate("parentCategory", "name").lean();
    return NextResponse.json({ success: true, category: updated, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update category." },
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

    const childCount = await Category.countDocuments({ parentCategory: id });
    if (childCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete: child categories exist. Reassign or delete them first." },
        { status: 400 }
      );
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    await Product.updateMany({ categories: id }, { $pull: { categories: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete category." },
      { status: 500 }
    );
  }
}
