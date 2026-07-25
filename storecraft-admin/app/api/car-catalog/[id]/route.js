import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { slugify } from "@/lib/carCatalogUtils";
import { normalizeCatalogModels, serializeCatalogModelForDb } from "@/lib/carCatalogNormalize";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { requestIp } from "@/lib/requestIp";

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
    const doc = await CarCatalog.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, make: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load make." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await CarCatalog.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    const body = await request.json();
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ success: false, error: "Make name must be at least 2 characters." }, { status: 400 });
      }
      doc.name = name;
    }
    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      const clash = await CarCatalog.findOne({ slug, _id: { $ne: id } }).select("_id").lean();
      if (clash) {
        return NextResponse.json({ success: false, error: "Slug already in use." }, { status: 400 });
      }
      doc.slug = slug;
    }
    if (body.order !== undefined) doc.order = Number(body.order) || 0;
    if (body.isActive !== undefined) doc.isActive = !!body.isActive;
    if (body.logo !== undefined) {
      doc.logo = String(body.logo || "").trim();
      doc.markModified("logo");
    }
    if (body.country !== undefined) doc.country = String(body.country || "Japan").trim() || "Japan";

    if (body.models !== undefined) {
      const models = normalizeCatalogModels(body.models);
      const slugs = models.map((m) => m.slug);
      if (new Set(slugs).size !== slugs.length) {
        return NextResponse.json({ success: false, error: "Duplicate model names within this make." }, { status: 400 });
      }
      for (const m of models) {
        if (m.name.length < 2) {
          return NextResponse.json({ success: false, error: "Each model name must be at least 2 characters." }, { status: 400 });
        }
      }
      doc.models = models.map(serializeCatalogModelForDb);
      doc.markModified("models");
    }

    await doc.save();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Car make updated: ${doc.name}`,
      resource: "CarCatalog",
      resourceId: String(doc._id),
      type: "car_catalog",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, make: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update make." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await CarCatalog.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Car make deleted: ${doc.name}`,
      resource: "CarCatalog",
      resourceId: String(id),
      type: "car_catalog",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete make." },
      { status: 500 }
    );
  }
}
