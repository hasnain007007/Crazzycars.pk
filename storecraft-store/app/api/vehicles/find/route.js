import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles/find?make=&model=&year= */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const y = parseInt(searchParams.get("year"), 10);
    if (!make || !model || !y) {
      return NextResponse.json(
        { success: false, error: "make, model and year are required" },
        { status: 400 }
      );
    }

    const candidates = await Vehicle.find({ make, model, isActive: true }).lean();
    const now = new Date().getFullYear() + 1;
    const match = candidates.find((v) => y >= v.yearFrom && y <= (v.yearTo || now));
    if (!match) {
      return NextResponse.json({ success: false, error: "No matching generation" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle: match, data: match });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
