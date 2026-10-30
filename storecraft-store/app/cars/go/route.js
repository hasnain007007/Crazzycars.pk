/**
 * GET /cars/go?car={slug} — no-JS target of the "Shop by your car" form.
 * Redirects to the car page when the slug is a known car page, else to /cars.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { loadShopByCarIndex } from "@/lib/vehiclePageData";
import { resolveCarSlug } from "@/lib/carSelector";
import { absoluteUrl } from "@/lib/siteUrl";

export async function GET(request) {
  const url = new URL(request.url);
  let target = "/cars";
  try {
    await dbConnect();
    const slug = resolveCarSlug(url.searchParams.get("car"), await loadShopByCarIndex());
    if (slug) target = `/cars/${slug}`;
  } catch {
    /* fall back to /cars */
  }
  // Public origin, not the container host behind the proxy.
  return NextResponse.redirect(absoluteUrl(target), 303);
}
