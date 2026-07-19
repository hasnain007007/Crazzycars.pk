import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles — full list for Shop By Your Vehicle grid */
export async function GET() {
  try {
    await dbConnect();
    const list = await Vehicle.find({ isActive: true }).sort({ make: 1, sortOrder: 1 }).lean();
    return NextResponse.json(
      { success: true, vehicles: list, data: list },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load vehicles." }, { status: 500 });
  }
}
