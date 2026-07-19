import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";

/** GET /api/vehicles/:slug */
export async function GET(_request, context) {
  try {
    await dbConnect();
    const { slug } = await context.params;
    const slugStr = String(slug || "").trim().toLowerCase();
    const v = await Vehicle.findOne({ slug: slugStr, isActive: true }).lean();
    if (!v) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, vehicle: v, data: v });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
