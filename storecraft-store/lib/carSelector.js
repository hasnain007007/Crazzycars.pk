/**
 * "Shop by your car" selector data: car pages (Vehicle docs with products) grouped by make.
 * Pure helpers — shared by the server form, /cars/go and the category ?car= filter.
 */

function yearsLabel(v) {
  if (!v?.yearFrom) return "";
  const now = new Date().getFullYear();
  const to = v.yearTo == null || Number(v.yearTo) >= now ? "Present" : v.yearTo;
  return `${v.yearFrom}–${to}`;
}

/** Option label without the make: "Corolla E170–E210 (2014–Present)". */
export function carOptionLabel(v) {
  const model = String(v?.model || "").trim();
  const gen = String(v?.generation || "").trim();
  // "Civic" + "Civic X" → "Civic X"; "Corolla" + "E140" → "Corolla E140".
  const name = !gen
    ? model
    : gen.toLowerCase().startsWith(model.toLowerCase())
      ? gen
      : model.toLowerCase().includes(gen.toLowerCase())
        ? model
        : `${model} ${gen}`;
  const years = yearsLabel(v);
  return years ? `${name} (${years})` : name || String(v?.displayName || v?.slug || "");
}

/** [{ make, options: [{ slug, label }] }] sorted by make, then model/year. */
export function groupVehiclesForSelect(vehicles = []) {
  const byMake = new Map();
  for (const v of vehicles) {
    if (!v?.slug) continue;
    const make = String(v.make || "Other").trim() || "Other";
    if (!byMake.has(make)) byMake.set(make, []);
    byMake.get(make).push(v);
  }
  return [...byMake.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([make, list]) => ({
      make,
      options: list
        .sort(
          (a, b) =>
            String(a.model).localeCompare(String(b.model)) || (Number(a.yearFrom) || 0) - (Number(b.yearFrom) || 0)
        )
        .map((v) => ({ slug: v.slug, label: carOptionLabel(v) })),
    }));
}

/** Validate a ?car= value against known car slugs (case-insensitive). Returns the slug or null. */
export function resolveCarSlug(raw, vehicles = []) {
  const want = String(raw || "").trim().toLowerCase();
  if (!want || !/^[a-z0-9-]{2,120}$/.test(want)) return null;
  const hit = vehicles.find((v) => String(v?.slug || "").toLowerCase() === want);
  return hit ? hit.slug : null;
}
