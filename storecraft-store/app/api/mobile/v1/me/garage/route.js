/**
 * GET /api/mobile/v1/me/garage — the signed-in customer's saved vehicles, with display fields.
 * PUT /api/mobile/v1/me/garage — replace them: { vehicles: [{ slug, yearStart?, yearEnd?, active? }] }.
 *
 * Unknown or inactive vehicle slugs are dropped (not an error) so an old phone cannot break the
 * list. At most MAX_GARAGE vehicles; one may be marked active per store segment.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { absoluteMediaUrl } from "@/lib/mobile/absoluteMediaUrl";
import { requireMobileAuth } from "@/lib/mobile/auth";
import { mobileError } from "@/lib/mobile/response";
import { segmentOf } from "@/lib/segment";
import { sanitizeGarageInput } from "@/lib/mobile/garage";

export const dynamic = "force-dynamic";

async function serializeGarage(entries) {
  const slugs = [...new Set(entries.map((e) => e.slug))];
  const vehicles = slugs.length
    ? await Vehicle.find({ slug: { $in: slugs }, isActive: { $ne: false } })
        .select("_id slug make model generation displayName image yearFrom yearTo segment")
        .lean()
    : [];
  const bySlug = new Map(vehicles.map((v) => [v.slug, v]));
  return entries
    .filter((e) => bySlug.has(e.slug))
    .map((e) => {
      const v = bySlug.get(e.slug);
      return {
        id: e.yearStart ? `${v._id}-${e.yearStart}` : String(v._id),
        slug: v.slug,
        make: v.make || "",
        model: v.model || "",
        generation: v.generation || "",
        displayName: v.displayName || "",
        image: absoluteMediaUrl(v.image),
        segment: segmentOf(v),
        yearStart: e.yearStart ?? v.yearFrom ?? null,
        yearEnd: e.yearEnd ?? v.yearTo ?? null,
        active: Boolean(e.active),
      };
    });
}

async function auth(request) {
  try {
    return await requireMobileAuth(request);
  } catch (err) {
    return { error: mobileError(err.code || "UNAUTHORIZED", err.message, { status: err.statusCode || 401 }) };
  }
}

export async function GET(request) {
  const ctx = await auth(request);
  if (ctx.error) return ctx.error;
  await dbConnect();
  const customer = await Customer.findById(ctx.customer._id).select("garage").lean();
  return NextResponse.json({ vehicles: await serializeGarage(customer?.garage || []) });
}

export async function PUT(request) {
  const ctx = await auth(request);
  if (ctx.error) return ctx.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("VALIDATION_ERROR", "Body must be JSON.", { status: 400 });
  }
  await dbConnect();
  const cleaned = sanitizeGarageInput(body?.vehicles);
  // Keep only vehicles that exist, so the stored list matches what GET returns.
  const known = new Set(
    (await Vehicle.find({ slug: { $in: cleaned.map((c) => c.slug) }, isActive: { $ne: false } })
      .select("slug")
      .lean()).map((v) => v.slug)
  );
  const garage = cleaned.filter((c) => known.has(c.slug)).map((c) => ({ ...c, addedAt: new Date() }));
  await Customer.updateOne({ _id: ctx.customer._id }, { $set: { garage } });
  return NextResponse.json({ vehicles: await serializeGarage(garage) });
}
