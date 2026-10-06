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
 * 2. Prefer `generationId` on fitment rows when Car Catalog model id is known.
 * 3. Legacy make+model only when the product has no ObjectId links — exclusive
 *    year overlap (≥2 years or full containment / exclusive boundaries).
 * 4. Never substring-match model names (Corolla must not match Corolla Cross).
 */
import mongoose from "mongoose";
import CarCatalog from "@/lib/models/CarCatalog.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { exclusiveYearOverlap } from "@/lib/fitmentGeneration";

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
 * Exclusive year overlap for legacy fitment `$elemMatch` rows.
 * ≥2 overlapping years OR full containment (exclusive-boundary single year).
 * Open-ended product rows (null yearTo) only match when yearFrom starts inside the vehicle span.
 * Adjacent gens that only share a boundary year do not match.
 */
export function exclusiveYearOverlapElemMatch(vFrom, vTo) {
  return {
    $or: [
      {
        yearFrom: { $lte: vTo - 1 },
        yearTo: { $gte: vFrom + 1, $ne: null },
      },
      {
        yearFrom: { $gte: vFrom },
        yearTo: { $lte: vTo, $ne: null },
      },
      {
        yearFrom: { $lte: vFrom },
        yearTo: { $gte: vTo, $ne: null },
      },
      {
        yearFrom: { $gte: vFrom, $lte: vTo },
        $or: [{ yearTo: null }, { yearTo: { $exists: false } }],
      },
    ],
  };
}

/** Alias used by callers / older docs. */
export function strictYearOverlapElemMatch(vFrom, vTo) {
  return exclusiveYearOverlapElemMatch(vFrom, vTo);
}

/**
 * Loose overlap (includes single shared boundary year). Prefer exclusive helpers.
 * @deprecated
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

function toObjectId(id) {
  if (id == null || id === "") return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  const s = String(id);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function pushGenerationIdClauses(or, catalogGenId) {
  const oid = toObjectId(catalogGenId);
  if (!oid) return;
  or.push({ compatibleCars: { $elemMatch: { generationId: oid } } });
  or.push({
    "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] },
    "vehicleCompatibility.vehicles": { $elemMatch: { generationId: oid } },
  });
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

/** Map catalog model slugs → nested model ObjectId (Car Catalog). */
export async function catalogGenerationIdsBySlugs(slugs) {
  const want = [
    ...new Set((slugs || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)),
  ];
  const map = new Map();
  if (!want.length) return map;

  const makes = await CarCatalog.find({
    isActive: true,
    "models.slug": { $in: want },
  })
    .select("models.slug models._id models.isActive")
    .lean();

  for (const make of makes) {
    for (const m of make.models || []) {
      if (m.isActive === false) continue;
      const slug = String(m.slug || "").toLowerCase();
      if (want.includes(slug) && m._id) {
        map.set(slug, m._id);
      }
    }
  }
  return map;
}

/** Resolve Car Catalog nested model _id for a Vehicle (catalogModelSlug). */
export async function catalogGenerationIdForVehicle(vehicle) {
  if (!vehicle) return null;
  const cached = vehicle.catalogGenerationId || vehicle.catalogModelId;
  if (cached) return cached;
  const slug = String(vehicle.catalogModelSlug || "").trim().toLowerCase();
  if (!slug) return null;
  const map = await catalogGenerationIdsBySlugs([slug]);
  return map.get(slug) || null;
}

/** Attach catalogGenerationId / catalogModelId for fitment matching. */
export async function enrichVehicleCatalogGeneration(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return vehicle;
  const id = await catalogGenerationIdForVehicle(vehicle);
  if (!id) return vehicle;
  return { ...vehicle, catalogGenerationId: id, catalogModelId: id };
}

/**
 * Mongo filter for `/cars/[slug]` product grids.
 * Primary: compatibleVehicles ObjectId. Then generationId. Legacy make+model+exclusive year.
 */
export function buildVehiclePageProductFilter(vehicle) {
  if (!vehicle?._id) {
    return { ...activeProductStatusFilter(), _id: null };
  }

  const { from: vFrom, to: vTo } = vehicleYearBounds(vehicle);
  const makeRx = exactFieldRegex(vehicle.make);
  const yearPart = exclusiveYearOverlapElemMatch(vFrom, vTo);
  const noLinks = noCompatibleVehiclesClause();
  const or = [{ compatibleVehicles: vehicle._id }];

  const catalogGenId = vehicle.catalogGenerationId || vehicle.catalogModelId;
  if (catalogGenId) {
    pushGenerationIdClauses(or, catalogGenId);
  }

  if (makeRx) {
    for (const label of exactModelLabelsForVehicle(vehicle)) {
      const modelRx = exactFieldRegex(label);
      if (!modelRx) continue;
      or.push({
        $and: [
          noLinks,
          { compatibleCars: { $elemMatch: { make: makeRx, model: modelRx, ...yearPart } } },
        ],
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
 * compatibleVehicles ObjectIds (+ generationId + legacy string-specific fitment).
 * Does not include isUniversal / fitmentType "universal".
 */
export async function buildMakeModelProductOr(make, model, year) {
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  const y = year != null && year !== "" ? Number(year) : null;

  const vehicleFilter = { isActive: true };
  if (mk) vehicleFilter.make = exactFieldRegex(mk);
  if (md) vehicleFilter.model = exactFieldRegex(md);

  let vehicles = await Vehicle.find(vehicleFilter)
    .select("_id make model yearFrom yearTo catalogModelSlug generation displayName")
    .lean();
  if (Number.isFinite(y)) {
    const now = new Date().getFullYear() + 1;
    vehicles = vehicles.filter((v) => y >= v.yearFrom && y <= (v.yearTo || now));
  }
  const vehicleIds = vehicles.map((v) => v._id);

  const slugMap = await catalogGenerationIdsBySlugs(
    vehicles.map((v) => v.catalogModelSlug).filter(Boolean)
  );

  const or = [];
  const noLinks = noCompatibleVehiclesClause();

  if (vehicleIds.length) {
    or.push({ compatibleVehicles: { $in: vehicleIds } });
  }

  for (const v of vehicles) {
    const slug = String(v.catalogModelSlug || "").toLowerCase();
    const genId = slugMap.get(slug);
    if (genId) {
      pushGenerationIdClauses(or, genId);
    }
  }

  const mkRx = mk ? exactFieldRegex(mk) : null;
  const mdRx = md ? exactFieldRegex(md) : null;
  if (mkRx || mdRx) {
    const elem = {};
    if (mkRx) elem.make = mkRx;
    if (mdRx) elem.model = mdRx;
    if (Number.isFinite(y)) {
      Object.assign(elem, exclusiveYearOverlapElemMatch(y, y));
    } else if (vehicles.length === 1) {
      const { from, to } = vehicleYearBounds(vehicles[0]);
      Object.assign(elem, exclusiveYearOverlapElemMatch(from, to));
    }
    const legacyCar = {
      $and: [noLinks, { compatibleCars: { $elemMatch: elem } }],
    };
    const legacyVc = {
      $and: [
        noLinks,
        { "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] } },
        { "vehicleCompatibility.vehicles": { $elemMatch: elem } },
      ],
    };
    or.push(legacyCar, legacyVc);
  }

  if (!or.length) {
    return { $or: [{ _id: null }], vehicleIds: [] };
  }

  return { $or: or, vehicleIds };
}

/** In-memory exclusive overlap check (tests / post-filters). */
export function productRowExclusiveOverlapsVehicle(row, vehicle) {
  const { from, to } = vehicleYearBounds(vehicle);
  return exclusiveYearOverlap(row?.yearFrom, row?.yearTo, from, to).overlaps;
}
