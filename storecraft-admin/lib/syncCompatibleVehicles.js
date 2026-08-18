/**
 * Resolve fitment table rows → Vehicle ObjectIds (for Shop by Car filters).
 */
import Vehicle from "@/lib/models/Vehicle.model";

function overlapsYear(vehicle, yearFrom, yearTo) {
  const vFrom = Number(vehicle.yearFrom) || 0;
  const vTo = vehicle.yearTo == null ? 9999 : Number(vehicle.yearTo);
  const from = yearFrom == null || yearFrom === "" ? null : Number(yearFrom);
  const to = yearTo == null || yearTo === "" ? null : Number(yearTo);
  if (!Number.isFinite(from) && !Number.isFinite(to)) return true;
  const a0 = Number.isFinite(from) ? from : 0;
  const a1 = Number.isFinite(to) ? to : 9999;
  return a0 <= vTo && a1 >= vFrom;
}

/**
 * @param {Array<{ make?: string, model?: string, yearFrom?: number, yearTo?: number }>} rows
 * @returns {Promise<import("mongoose").Types.ObjectId[]>}
 */
export async function resolveCompatibleVehicleIds(rows) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && (r.make || r.model)) : [];
  if (!list.length) return [];

  const makes = [...new Set(list.map((r) => String(r.make || "").trim()).filter(Boolean))];
  const candidates = await Vehicle.find(
    makes.length ? { make: { $in: makes }, isActive: { $ne: false } } : { isActive: { $ne: false } }
  )
    .select("_id make model yearFrom yearTo displayName")
    .lean();

  const ids = [];
  const seen = new Set();

  for (const row of list) {
    const make = String(row.make || "").trim().toLowerCase();
    const model = String(row.model || "").trim().toLowerCase();
    if (!make || !model || make === "all makes" || model === "all models") continue;

    const matches = candidates.filter((v) => {
      if (String(v.make || "").trim().toLowerCase() !== make) return false;
      const vm = String(v.model || "").trim().toLowerCase();
      if (vm === model) return overlapsYear(v, row.yearFrom, row.yearTo);
      // Family match: "Corolla" row ↔ "Corolla Axio" vehicle, but not Cross
      if (vm.startsWith(`${model} `) || vm.startsWith(`${model}(`)) {
        if (model === "corolla" && vm.includes("cross")) return false;
        return overlapsYear(v, row.yearFrom, row.yearTo);
      }
      return false;
    });

    for (const m of matches) {
      const id = String(m._id);
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(m._id);
    }
  }

  return ids;
}
