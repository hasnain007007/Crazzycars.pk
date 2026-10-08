import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { ensureVehicleFromCatalog } from "@/lib/vehiclePageData";

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
    const catalogSlug = String(searchParams.get("catalogSlug") || "")
      .trim()
      .toLowerCase();
    const y = parseInt(searchParams.get("year"), 10);

    // Prefer exact catalog model slug — avoids wrong generation on shared boundary years
    // (e.g. Civic yearFrom=2016 matching Rebirth 2012–2016 instead of Civic X).
    if (catalogSlug) {
      const bySlug =
        (await Vehicle.findOne({ slug: catalogSlug, isActive: true }).lean()) ||
        (await Vehicle.findOne({ catalogModelSlug: catalogSlug, isActive: true }).lean());
      if (bySlug) {
        return NextResponse.json({ success: true, vehicle: bySlug, data: bySlug });
      }

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

    if (!make || !model || !Number.isFinite(y)) {
      return NextResponse.json(
        { success: false, error: "make, model and year are required (or catalogSlug)" },
        { status: 400 }
      );
    }

    const cleanedModel =
      model.replace(new RegExp(`^${escapeRegex(make)}\\s+`, "i"), "").trim() || model;
    const candidates = await Vehicle.find({
      make: new RegExp(`^${escapeRegex(make)}$`, "i"),
      model: new RegExp(`^${escapeRegex(cleanedModel)}$`, "i"),
      isActive: true,
    }).lean();

    const now = new Date().getFullYear() + 1;
    // Prefer the generation whose yearFrom is closest to (but ≤) the selected year,
    // so shared boundary years (e.g. 2016) resolve to the newer generation.
    const matches = candidates.filter((v) => y >= v.yearFrom && y <= (v.yearTo || now));
    matches.sort((a, b) => b.yearFrom - a.yearFrom);
    const match = matches[0];

    if (!match) {
      return NextResponse.json({ success: false, error: "No matching generation" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle: match, data: match });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
