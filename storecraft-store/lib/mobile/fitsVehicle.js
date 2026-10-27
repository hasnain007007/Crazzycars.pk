/**
 * Mobile fitment — same inclusion rules as the website `/cars/[slug]` grid
 * (`buildVehiclePageProductFilter` in productVehicleQuery.js).
 *
 * Design:
 * - List: when `?vehicle=<slug>` is present, apply that Mongo filter (only fitting
 *   products) and set `fitsVehicle: true` on every returned card.
 * - Detail: when `?vehicle=<slug>` is present, resolve Vehicle and set
 *   `fitsVehicle` via Product.exists(filter + _id) so logic cannot drift.
 * - Universal-only catalog items are NOT auto-included (web parity).
 */
import Product from "@/lib/models/Product.model";
import { buildVehiclePageProductFilter } from "@/lib/productVehicleQuery";

export function fittingProductsFilter(vehicle) {
  return buildVehiclePageProductFilter(vehicle);
}

/** Annotate list cards after a vehicle-scoped query (all rows fit by construction). */
export function markFitsVehicleTrue(summary) {
  return { ...summary, fitsVehicle: true };
}

/**
 * Ground-truth check for a single product against a vehicle doc.
 * @returns {Promise<boolean>}
 */
export async function productFitsVehicleExists(productId, vehicle) {
  if (!productId || !vehicle?._id) return false;
  const filter = {
    ...buildVehiclePageProductFilter(vehicle),
    _id: productId,
  };
  const hit = await Product.exists(filter);
  return Boolean(hit);
}

/**
 * Universal products — fit any car (garage "Universal" tab). Not vehicle-specific, so they are
 * kept apart from the exact-fit list rather than mixed into it (web /cars parity stays intact).
 */
export function universalProductsFilter() {
  return {
    $or: [{ isUniversal: true }, { "vehicleCompatibility.fitmentType": "universal" }],
  };
}

/** Fit scopes for list queries: exact-fit only, universal only, or both. */
export const FIT_SCOPES = ["specific", "universal", "all"];

/**
 * Build the Mongo filter for a fit scope. Each branch is wrapped in $and so callers can still add
 * their own $or (text search) without clobbering it.
 */
export function fitScopeFilter(vehicle, scope) {
  const exact = fittingProductsFilter(vehicle);
  const { $or: exactOr, ...exactRest } = exact;
  if (scope === "universal") return universalProductsFilter();
  if (scope === "all") {
    return { ...exactRest, $and: [{ $or: [...exactOr, ...universalProductsFilter().$or] }] };
  }
  return { ...exactRest, $and: [{ $or: exactOr }] };
}

/**
 * Label each product for a vehicle: "exact" (listed for this car), "universal", or "none".
 * One query for the whole page so list cards and detail share the same rule.
 * @returns {Promise<Map<string, "exact"|"universal"|"none">>}
 */
export async function fitmentLabels(products, vehicle) {
  const out = new Map();
  if (!products.length) return out;
  const ids = products.map((p) => p._id);
  const exactIds = vehicle?._id
    ? new Set(
        (await Product.find({ ...fittingProductsFilter(vehicle), _id: { $in: ids } }).select("_id").lean()).map(
          (d) => String(d._id)
        )
      )
    : new Set();
  for (const p of products) {
    const id = String(p._id);
    const universal = p.isUniversal === true || p.vehicleCompatibility?.fitmentType === "universal";
    out.set(id, exactIds.has(id) ? "exact" : universal ? "universal" : "none");
  }
  return out;
}
