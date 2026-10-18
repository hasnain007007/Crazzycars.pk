/**
 * Store segments: CrazzyCars runs two catalogs side by side — cars (default) and bikes.
 * Documents without a `segment` field are cars, so the existing catalog needs no migration.
 */
export const SEGMENTS = ["car", "bike"];

/** Vehicle filter that sees both stores (Vehicle reads default to cars — see Vehicle.model.js). */
export const ANY_SEGMENT = { segment: { $in: ["car", "bike", null] } };

/** Normalise a query value; unknown → null (no segment filter). */
export function parseSegment(value) {
  const v = String(value || "").trim().toLowerCase();
  return SEGMENTS.includes(v) ? v : null;
}

/** Mongo filter for a segment. Cars include legacy docs with no field. */
export function segmentFilter(segment) {
  if (segment === "bike") return { segment: "bike" };
  if (segment === "car") return { segment: { $in: ["car", null] } };
  return {};
}

export function segmentOf(doc) {
  return doc?.segment === "bike" ? "bike" : "car";
}

/** Keep only top-level category nodes of one segment (children follow their parent). */
export function filterCategoryTreeBySegment(tree, segment) {
  if (!segment || !Array.isArray(tree)) return tree;
  return tree.filter((node) => segmentOf(node) === segment);
}
