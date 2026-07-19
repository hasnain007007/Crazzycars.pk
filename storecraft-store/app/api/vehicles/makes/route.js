import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles/makes */
export async function GET() {
  try {
    await dbConnect();
    const makes = await Vehicle.distinct("make", { isActive: true });
    const sorted = (makes || []).filter(Boolean).sort();
    return NextResponse.json({ success: true, makes: sorted, data: sorted });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
