/**
 * GET /api/mobile/v1/catalog/vehicles
 * Returns active vehicles list for "Shop By Your Vehicle".
 * Query: segment=car|bike (default car).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Vehicle from "@/lib/models/Vehicle.model";
import { absoluteMediaUrl } from "@/lib/mobile/absoluteMediaUrl";
import { parseSegment, segmentFilter, segmentOf } from "@/lib/segment";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await dbConnect();
    const segment = parseSegment(new URL(request.url).searchParams.get("segment")) || "car";
    const vehicles = await Vehicle.find({ isActive: true, ...segmentFilter(segment) })
      .select("make model generation displayName slug image yearFrom yearTo sortOrder segment")
      .sort({ make: 1, sortOrder: 1 })
      .lean();

    return NextResponse.json(
      { vehicles: vehicles.map((v) => ({
          id: String(v._id),
          make: v.make || "",
          model: v.model || "",
          generation: v.generation || "",
          slug: v.slug || "",
          image: absoluteMediaUrl(v.image),
          displayName: v.displayName || "",
          segment: segmentOf(v),
          // Schema stores yearFrom/yearTo; keep the yearStart/yearEnd names the app already reads.
          yearStart: v.yearFrom ?? null,
          yearEnd: v.yearTo ?? null,
        })) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[mobile/catalog/vehicles]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load vehicles." } }, { status: 500 });
  }
}
