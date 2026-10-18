/**
 * GET /api/bike-catalog — bike models for the product fitment picker, in the same
 * { makes: [{ name, models: [...] }] } shape as /api/car-catalog so buildCatalogFromMakes works.
 * Source: Vehicle docs with segment "bike" (seeded by storecraft-store seedBikeCatalog.mjs).
 * Saving a row (make + model) links the product to the bike via resolveCompatibleVehicleIds.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Vehicle from "@/lib/models/Vehicle.model";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const bikes = await Vehicle.find({ segment: "bike", isActive: { $ne: false } })
      .select("_id make model yearFrom yearTo sortOrder")
      .sort({ make: 1, sortOrder: 1, model: 1 })
      .lean();
    const byMake = new Map();
    for (const b of bikes) {
      if (!byMake.has(b.make)) byMake.set(b.make, []);
      const yearTo = b.yearTo ?? new Date().getFullYear();
      const years = [];
      for (let y = yearTo; y >= (b.yearFrom || yearTo); y -= 1) years.push(y);
      byMake.get(b.make).push({
        _id: String(b._id),
        name: b.model,
        slug: "",
        years,
        yearFrom: b.yearFrom ?? null,
        yearTo: b.yearTo ?? null,
        isActive: true,
      });
    }
    const makes = [...byMake.entries()].map(([name, models]) => ({ name, isActive: true, models }));
    return NextResponse.json({ success: true, makes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load bike catalog." },
      { status: 500 }
    );
  }
}
