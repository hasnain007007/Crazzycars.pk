/**
 * GET /api/fits?product=<product-slug>&vehicle=<vehicle-slug>
 * Does this product fit the shopper's saved car? Uses the same rule as the /cars/[slug] grid
 * (buildVehiclePageProductFilter), so the product page tag and the car page always agree.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { buildVehiclePageProductFilter } from "@/lib/productVehicleQuery";
import { loadVehicleBySlug } from "@/lib/vehiclePageData";

const SLUG_RE = /^[a-z0-9-]{1,160}$/;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productSlug = String(searchParams.get("product") || "").trim().toLowerCase();
  const vehicleSlug = String(searchParams.get("vehicle") || "").trim().toLowerCase();
  if (!SLUG_RE.test(productSlug) || !SLUG_RE.test(vehicleSlug)) {
    return NextResponse.json({ fits: false }, { status: 400 });
  }
  try {
    await dbConnect();
    const vehicle = await loadVehicleBySlug(vehicleSlug);
    if (!vehicle) return NextResponse.json({ fits: false });
    const hit = await Product.exists({ ...buildVehiclePageProductFilter(vehicle), slug: productSlug });
    // Universal parts are not listed per car — the product page should not say "not listed".
    const universal = hit
      ? false
      : Boolean(
          await Product.exists({
            slug: productSlug,
            $or: [{ isUniversal: true }, { "vehicleCompatibility.fitmentType": "universal" }],
          })
        );
    return NextResponse.json(
      { fits: Boolean(hit), universal },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=300" } }
    );
  } catch (err) {
    console.error("[api/fits]", err?.message || err);
    return NextResponse.json({ fits: false }, { status: 500 });
  }
}
