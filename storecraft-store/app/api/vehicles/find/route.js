import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";
import { ensureVehicleFromCatalog } from "@/lib/vehiclePageData";
import CarCatalog from "@/lib/models/CarCatalog.model";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GET /api/vehicles/find?make=&model=&year=&catalogSlug= */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const make = String(searchParams.get("make") || "").trim();
    const model = String(searchParams.get("model") || "").trim();
    const catalogSlug = String(searchParams.get("catalogSlug") || "").trim().toLowerCase();
    const y = parseInt(searchParams.get("year"), 10);

    if (catalogSlug) {
      const makeDoc = await CarCatalog.findOne({
        isActive: true,
        ...(make ? { name: new RegExp(`^${escapeRegex(make)}$`, "i") } : {}),
        "models.slug": catalogSlug,
      }).lean();
      const modelDoc = (makeDoc?.models || []).find(
        (m) => String(m.slug || "").toLowerCase() === catalogSlug && m.isActive !== false
      );
      if (makeDoc && modelDoc) {
        const vehicle = await ensureVehicleFromCatalog(makeDoc, modelDoc);
        if (vehicle) {
          return NextResponse.json({ success: true, vehicle, data: vehicle });
        }
      }
    }

    if (!make || !model) {
      return NextResponse.json(
        { success: false, error: "make and model are required (or catalogSlug)" },
        { status: 400 }
      );
    }

    const cleanedModel = model.replace(new RegExp(`^${escapeRegex(make)}\\s+`, "i"), "").trim() || model;
    let candidates = await Vehicle.find({
      make: new RegExp(`^${escapeRegex(make)}$`, "i"),
      model: new RegExp(escapeRegex(cleanedModel), "i"),
      isActive: true,
    }).lean();

    if (!candidates.length) {
      candidates = await Vehicle.find({
        make: new RegExp(`^${escapeRegex(make)}$`, "i"),
        $or: [
          { model: new RegExp(escapeRegex(model), "i") },
          { generation: new RegExp(escapeRegex(model), "i") },
          { displayName: new RegExp(escapeRegex(cleanedModel), "i") },
        ],
        isActive: true,
      }).lean();
    }

    const now = new Date().getFullYear() + 1;
    const match = Number.isFinite(y)
      ? candidates.find((v) => y >= v.yearFrom && y <= (v.yearTo || now))
      : candidates[0];

    if (!match) {
      // Last chance: create from catalog by make + model name
      const makeDoc = await CarCatalog.findOne({
        name: new RegExp(`^${escapeRegex(make)}$`, "i"),
        isActive: true,
      }).lean();
      const modelDoc = (makeDoc?.models || []).find((m) => {
        const n = String(m.name || "").toLowerCase();
        const want = cleanedModel.toLowerCase();
        return n === want || n.includes(want) || want.includes(n.replace(/^toyota\s+/, ""));
      });
      if (makeDoc && modelDoc) {
        const vehicle = await ensureVehicleFromCatalog(makeDoc, modelDoc);
        if (vehicle) return NextResponse.json({ success: true, vehicle, data: vehicle });
      }
      return NextResponse.json({ success: false, error: "No matching generation" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle: match, data: match });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
