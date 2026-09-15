/**
 * Canonical vehicle fitment filter for product queries.
 *
 * Car/vehicle sections only include products explicitly linked to that vehicle
 * (compatibleVehicles / legacy specific fitment). Universal catalog items are
 * NOT auto-included — add them to the car in admin if they should appear.
 *
 * StoreCraft uses `status: "active"` (not isActive on Product).
 *
 * Matching rules for generation pages / make-model filters:
 * 1. Prefer `compatibleVehicles` ObjectId links (generation-accurate).
 * 2. Legacy `compatibleCars` / `vehicleCompatibility` only when the product has
 *    no ObjectId links — require exact make + exact model + year-range overlap.
 * 3. Never substring-match model names (Corolla must not match Corolla Cross).
 */
import Vehicle from "@/lib/models/Vehicle.model";

export function activeProductStatusFilter() {
  return { status: { $regex: /^active$/i }, securityHold: { $ne: true } };
}

export function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Anchored case-insensitive equality for make/model fields. */
export function exactFieldRegex(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  return new RegExp(`^${escapeRegex(v)}$`, "i");
}

export function vehicleYearBounds(vehicle) {
  const yearFrom = Number(vehicle?.yearFrom);
  const from = Number.isFinite(yearFrom) ? yearFrom : 0;
  const rawTo = vehicle?.yearTo;
  if (rawTo == null || rawTo === "") return { from, to: 9999 };
  const to = Number(rawTo);
  return { from, to: Number.isFinite(to) ? to : 9999 };
}

/**
 * Mongo $elemMatch fragment: product year range overlaps [vFrom, vTo].
 * Missing yearTo is treated as "present" (open-ended).
 */
export function yearOverlapElemMatch(vFrom, vTo) {
  return {
    yearFrom: { $lte: vTo },
    $or: [{ yearTo: null }, { yearTo: { $exists: false } }, { yearTo: { $gte: vFrom } }],
  };
}

/** Products with no generation ObjectId links (legacy-only fitment). */
export function noCompatibleVehiclesClause() {
  return {
    $or: [
      { compatibleVehicles: { $exists: false } },
      { compatibleVehicles: null },
      { compatibleVehicles: { $size: 0 } },
    ],
  };
}

/**
 * Exact model labels to accept for a Vehicle when falling back to legacy rows.
 * Includes cleaned model + generation nickname (some rows store "Reborn" / "E140"
 * as `model`), never substring siblings like Corolla⊂Corolla Cross.
 */
export function exactModelLabelsForVehicle(vehicle) {
  const make = String(vehicle?.make || "").trim();
  const model = String(vehicle?.model || "").trim();
  const generation = String(vehicle?.generation || "").trim();
  const cleaned = cleanModelLabel(make, model);
  const labels = [model, cleaned, generation];
  if (/mark\s*x/i.test(`${model} ${cleaned} ${generation}`)) {
    labels.push("Mark X", "mark x", "toyota mark x", "1 Gen(X120)", "1 Gen (X120)");
  }
  return [...new Set(labels.map((a) => String(a || "").trim()).filter(Boolean))];
}

function cleanModelLabel(makeName, modelName) {
  let model = String(modelName || "").trim();
  const make = String(makeName || "").trim();
  if (!model) return model;
  if (make) {
    model = model.replace(new RegExp(`^${escapeRegex(make)}\\s+`, "i"), "").trim();
  }
  return model.replace(/\s+/g, " ").trim() || String(modelName || "").trim();
}

/**
 * Mongo filter for `/cars/[slug]` product grids.
 * Primary: compatibleVehicles ObjectId. Legacy make+model+year only if no ObjectIds.
 */
export function buildVehiclePageProductFilter(vehicle) {
  if (!vehicle?._id) {
    return { ...activeProductStatusFilter(), _id: null };
  }

  const { from: vFrom, to: vTo } = vehicleYearBounds(vehicle);
  const makeRx = exactFieldRegex(vehicle.make);
  const yearPart = yearOverlapElemMatch(vFrom, vTo);
  const noLinks = noCompatibleVehiclesClause();
  const or = [{ compatibleVehicles: vehicle._id }];

  if (makeRx) {
    for (const label of exactModelLabelsForVehicle(vehicle)) {
      const modelRx = exactFieldRegex(label);
      if (!modelRx) continue;
      or.push({
        $and: [noLinks, { compatibleCars: { $elemMatch: { make: makeRx, model: modelRx, ...yearPart } } }],
      });
      or.push({
        $and: [
          noLinks,
          { "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] } },
          {
            "vehicleCompatibility.vehicles": {
              $elemMatch: { make: makeRx, model: modelRx, ...yearPart },
            },
          },
        ],
      });
    }
  }

  return { ...activeProductStatusFilter(), $or: or };
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
  if (mk) vehicleFilter.make = exactFieldRegex(mk);
  if (md) vehicleFilter.model = exactFieldRegex(md);

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

  // Legacy rows: only products with no ObjectId links; exact model; year overlap when year given.
  const mkRx = mk ? exactFieldRegex(mk) : null;
  const mdRx = md ? exactFieldRegex(md) : null;
  if (mkRx || mdRx) {
    const elem = {};
    if (mkRx) elem.make = mkRx;
    if (mdRx) elem.model = mdRx;
    if (Number.isFinite(y)) {
      Object.assign(elem, yearOverlapElemMatch(y, y));
    }
    const legacyCar = {
      $and: [noCompatibleVehiclesClause(), { compatibleCars: { $elemMatch: elem } }],
    };
    const legacyVc = {
      $and: [
        noCompatibleVehiclesClause(),
        { "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] } },
        { "vehicleCompatibility.vehicles": { $elemMatch: elem } },
      ],
    };
    or.push(legacyCar, legacyVc);
  }

  // No matching vehicles and no make/model → empty $or would match everything; force no results.
  if (!or.length) {
    return { $or: [{ _id: null }], vehicleIds: [] };
  }

  return { $or: or, vehicleIds };
}
