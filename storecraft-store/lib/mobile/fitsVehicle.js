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
