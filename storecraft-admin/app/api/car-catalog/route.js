import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { slugify } from "@/lib/carCatalogUtils";
import { normalizeCatalogModels, serializeCatalogModelForDb } from "@/lib/carCatalogNormalize";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const makes = await CarCatalog.find({}).sort({ order: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, makes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load car catalog." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (name.length < 2) {
      return NextResponse.json({ success: false, error: "Make name must be at least 2 characters." }, { status: 400 });
    }
    const slug = slugify(body.slug || name);
    const exists = await CarCatalog.findOne({ slug }).select("_id").lean();
    if (exists) {
      return NextResponse.json({ success: false, error: "A make with this slug already exists." }, { status: 400 });
    }
    const count = await CarCatalog.countDocuments();
    const doc = await CarCatalog.create({
      name,
      slug,
      order: body.order ?? count,
      isActive: body.isActive !== false,
      logo: String(body.logo || "").trim(),
      country: String(body.country || "Japan").trim() || "Japan",
      models: Array.isArray(body.models) ? normalizeCatalogModels(body.models).map(serializeCatalogModelForDb) : [],
    });

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Car make created: ${name}`,
      resource: "CarCatalog",
      resourceId: String(doc._id),
      type: "car_catalog",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, make: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create make." },
      { status: 500 }
    );
  }
}
