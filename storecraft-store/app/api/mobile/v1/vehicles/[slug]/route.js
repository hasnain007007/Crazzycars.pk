/**
 * GET /api/mobile/v1/vehicles/[slug]
 * One vehicle for the garage: display fields + how many parts fit it exactly and how many
 * universal parts apply (garage card "48 parts fit", parts-page tab counts).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { absoluteMediaUrl } from "@/lib/mobile/absoluteMediaUrl";
import { fitScopeFilter } from "@/lib/mobile/fitsVehicle";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { segmentFilter, segmentOf } from "@/lib/segment";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const slug = String((await context.params).slug || "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing slug." } }, { status: 400 });
  }
  try {
    await dbConnect();
    const v = await Vehicle.findOne({ slug, isActive: true }).lean();
    if (!v) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Vehicle not found." } }, { status: 404 });
    }
    // Universal parts are counted within the vehicle's own store (car parts never count for a bike).
    const seg = segmentFilter(segmentOf(v));
    const [exact, universal] = await Promise.all([
      Product.countDocuments({ ...STOREFRONT_PRODUCT_FILTER, ...seg, ...fitScopeFilter(v, "specific") }),
      Product.countDocuments({ ...STOREFRONT_PRODUCT_FILTER, ...seg, ...fitScopeFilter(v, "universal") }),
    ]);
    return NextResponse.json({
      vehicle: {
        id: String(v._id),
        slug: v.slug,
        make: v.make || "",
        model: v.model || "",
        generation: v.generation || "",
        displayName: v.displayName || `${v.make} ${v.model}`.trim(),
        segment: segmentOf(v),
        yearFrom: v.yearFrom ?? null,
        yearTo: v.yearTo ?? null,
        image: absoluteMediaUrl(v.image),
      },
      counts: { exact, universal },
    });
  } catch (err) {
    console.error("[mobile/vehicles/[slug]]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load vehicle." } }, { status: 500 });
  }
}
