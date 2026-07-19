import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles/models?make=Honda */
export async function GET(request) {
  try {
    await dbConnect();
    const make = new URL(request.url).searchParams.get("make");
    if (!make) {
      return NextResponse.json({ success: false, error: "make is required" }, { status: 400 });
    }
    const models = await Vehicle.distinct("model", { make, isActive: true });
    const sorted = (models || []).filter(Boolean).sort();
    return NextResponse.json({ success: true, models: sorted, data: sorted });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
