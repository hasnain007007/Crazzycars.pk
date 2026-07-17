import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { slugify, yearsFromRange } from "@/lib/carCatalogUtils";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import CarCatalog from "@/lib/models/CarCatalog.model";

export async function POST(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await CarCatalog.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    const body = await request.json();
    const name = String(body.name || "").trim();
    if (name.length < 2) {
      return NextResponse.json({ success: false, error: "Model name must be at least 2 characters." }, { status: 400 });
    }
    const slug = slugify(body.slug || name);
    if (doc.models.some((m) => m.slug === slug)) {
      return NextResponse.json({ success: false, error: "Model already exists for this make." }, { status: 400 });
    }

    const yearFrom = Number(body.yearFrom);
    const yearTo = Number(body.yearTo);
    if (!Number.isFinite(yearFrom) || !Number.isFinite(yearTo) || yearFrom < 1980 || yearTo > 2026 || yearTo < yearFrom) {
      return NextResponse.json({ success: false, error: "Invalid year range." }, { status: 400 });
    }

    doc.models.push({
      name,
      slug,
      years: yearsFromRange(yearFrom, yearTo),
      isActive: body.isActive !== false,
    });
    doc.markModified("models");
    await doc.save();

    return NextResponse.json({ success: true, make: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add model." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await CarCatalog.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    const body = await request.json();
    const modelId = body.modelId;
    if (!modelId || !mongoose.Types.ObjectId.isValid(modelId)) {
      return NextResponse.json({ success: false, error: "Valid modelId required." }, { status: 400 });
    }

    const model = doc.models.id(modelId);
    if (!model) return NextResponse.json({ success: false, error: "Model not found." }, { status: 404 });

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ success: false, error: "Model name must be at least 2 characters." }, { status: 400 });
      }
      model.name = name;
    }
    if (body.slug !== undefined) model.slug = slugify(body.slug);
    if (body.isActive !== undefined) model.isActive = !!body.isActive;
    if (body.yearFrom != null && body.yearTo != null) {
      const yearFrom = Number(body.yearFrom);
      const yearTo = Number(body.yearTo);
      if (!Number.isFinite(yearFrom) || !Number.isFinite(yearTo) || yearFrom < 1980 || yearTo > 2026 || yearTo < yearFrom) {
        return NextResponse.json({ success: false, error: "Invalid year range." }, { status: 400 });
      }
      model.years = yearsFromRange(yearFrom, yearTo);
    } else if (Array.isArray(body.years)) {
      model.years = body.years.map(Number).filter(Number.isFinite);
    }

    doc.markModified("models");
    await doc.save();

    return NextResponse.json({ success: true, make: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update model." },
      { status: 500 }
    );
  }
}
