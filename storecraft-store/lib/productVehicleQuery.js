/**
 * Canonical vehicle fitment filter for product queries.
 *
 * Car/vehicle sections only include products explicitly linked to that vehicle
 * (compatibleVehicles / legacy specific fitment). Universal catalog items are
 * NOT auto-included — add them to the car in admin if they should appear.
 *
 * StoreCraft uses `status: "active"` (not isActive on Product).
 */
import Vehicle from "@/lib/models/Vehicle.model";

export function activeProductStatusFilter() {
  return { status: { $regex: /^active$/i } };
}

/** Active products explicitly linked to this Vehicle ObjectId. */
export function productsForVehicleIdFilter(vehicleId) {
  return {
    ...activeProductStatusFilter(),
    compatibleVehicles: vehicleId,
  };
}

/**
 * Resolve Vehicle docs for make/model/year, then build product $or for
 * compatibleVehicles ObjectIds (+ legacy string-specific fitment fields).
 * Does not include isUniversal / fitmentType "universal".
 */
export async function buildMakeModelProductOr(make, model, year) {
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  const y = year != null && year !== "" ? Number(year) : null;

  const vehicleFilter = { isActive: true };
  if (mk) vehicleFilter.make = new RegExp(`^${escapeRegex(mk)}$`, "i");
  if (md) vehicleFilter.model = new RegExp(`^${escapeRegex(md)}$`, "i");

  let vehicles = await Vehicle.find(vehicleFilter).select("_id make model yearFrom yearTo").lean();
  if (Number.isFinite(y)) {
    const now = new Date().getFullYear() + 1;
    vehicles = vehicles.filter((v) => y >= v.yearFrom && y <= (v.yearTo || now));
  }
  const vehicleIds = vehicles.map((v) => v._id);

  const or = [];

  if (vehicleIds.length) {
    or.push({ compatibleVehicles: { $in: vehicleIds } });
  }

  const mkRx = mk ? new RegExp(`^${escapeRegex(mk)}$`, "i") : null;
  const mdRx = md ? new RegExp(escapeRegex(md), "i") : null;
  const legacy = {};
  if (mkRx) legacy.make = mkRx;
  if (mdRx) legacy.model = mdRx;
  if (Object.keys(legacy).length) {
    or.push({ compatibleCars: { $elemMatch: legacy } });
    or.push({
      "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] },
      "vehicleCompatibility.vehicles": { $elemMatch: legacy },
    });
  }

  // No matching vehicles and no make/model → empty $or would match everything; force no results.
  if (!or.length) {
    return { $or: [{ _id: null }], vehicleIds: [] };
  }

  return { $or: or, vehicleIds };
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
