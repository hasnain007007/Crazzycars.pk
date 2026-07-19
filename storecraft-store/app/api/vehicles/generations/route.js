import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles/generations?make=Honda&model=Civic */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    if (!make || !model) {
      return NextResponse.json({ success: false, error: "make and model are required" }, { status: 400 });
    }
    const gens = await Vehicle.find({ make, model, isActive: true }).sort({ yearFrom: 1 }).lean();
    return NextResponse.json({ success: true, generations: gens, data: gens });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
