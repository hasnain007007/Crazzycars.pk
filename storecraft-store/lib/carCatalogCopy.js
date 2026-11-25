/**
 * Pure Car Catalog copy helpers (no DB) — exact slug/id binding only.
 */

/**
 * Coerce vehicle/catalog image fields to a usable URL string.
 * Vehicle.image is often `{ url, publicId, ... }`; String(obj) becomes "[object Object]".
 * @param {unknown} value
 * @returns {string}
 */
export function mediaImageUrl(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!s || s === "[object Object]") return "";
    return s;
  }
  if (typeof value === "object") {
    const u = value.url ?? value.secure_url ?? value.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

/**
 * Static car thumbs shipped in `public/vehicle-photos/` for catalog rows that
 * never got a `/media/cars/…` upload (Jetour T1/T2, BYD Atto 2, Audi, etc.).
 */
const VEHICLE_PHOTO_FALLBACK_SLUGS = new Set([
  "audi-a4-2008-present",
  "audi-a5-2008-present",
  "byd-atto2-2025-present",
  "byd-shark6-2025-present",
  "jetour-t1-2024-present",
  "jetour-t2-2024-present",
  "mercedes-benz-e-class-2009-present",
]);

/** @param {string} slug */
export function vehiclePhotoFallbackUrl(slug) {
  const s = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!s || !VEHICLE_PHOTO_FALLBACK_SLUGS.has(s)) return "";
  return `/vehicle-photos/${s}.webp`;
}

/**
 * Prefer Mongo `/media/cars` URL; otherwise the static fallback thumb.
 * @param {unknown} image
 * @param {string} [slug]
 */
export function resolveVehicleImageUrl(image, slug = "") {
  return mediaImageUrl(image) || vehiclePhotoFallbackUrl(slug) || "";
}

function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function yearSpan(v) {
  const from = Number(v?.yearFrom);
  const to = Number(v?.yearTo);
  const a = Number.isFinite(from) ? from : 0;
  const b = Number.isFinite(to) ? to : 9999;
  return [Math.min(a, b), Math.max(a, b)];
}

function rangeContained(inner, outer) {
  return inner[0] >= outer[0] && inner[1] <= outer[1] && !(inner[0] === outer[0] && inner[1] === outer[1]);
}

function vehicleRank(v) {
  const hasImg = mediaImageUrl(v?.image) || vehiclePhotoFallbackUrl(v?.slug) ? 1 : 0;
  const [from, to] = yearSpan(v);
  const span = to - from;
  const hasGen = String(v?.generation || v?.nickname || "").trim() ? 1 : 0;
  return hasImg * 1e6 + hasGen * 1e3 + span;
}

/**
 * Drop true catalog duplicates: same make+model where one year range is a
 * strict subset of another (e.g. Audi A5 2014–2016 inside A5 2008–Present).
 * Distinct generations with adjacent/non-subset years are kept.
 * @template {{ make?: string, model?: string, slug?: string, yearFrom?: number|null, yearTo?: number|null, image?: unknown, generation?: string, nickname?: string }} T
 * @param {T[]} list
 * @returns {T[]}
 */
export function dedupeOverlappingVehicleGens(list) {
  const rows = Array.isArray(list) ? list.filter(Boolean) : [];
  if (rows.length < 2) return rows;

  const byMakeModel = new Map();
  for (const v of rows) {
    const key = `${normKey(v.make)}|${normKey(v.model)}`;
    if (!byMakeModel.has(key)) byMakeModel.set(key, []);
    byMakeModel.get(key).push(v);
  }

  const drop = new Set();
  for (const group of byMakeModel.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = 0; j < group.length; j++) {
        if (i === j) continue;
        const a = group[i];
        const b = group[j];
        const ra = yearSpan(a);
        const rb = yearSpan(b);
        // Prefer dropping the contained / weaker row.
        if (rangeContained(ra, rb) || (ra[0] === rb[0] && ra[1] === rb[1] && vehicleRank(a) < vehicleRank(b))) {
          drop.add(String(a.slug || ""));
        }
      }
    }
  }

  if (!drop.size) return rows;
  return rows.filter((v) => !drop.has(String(v.slug || "")));
}

/**
 * Exact Car Catalog model match by nested model.slug (case-insensitive).
 * Never matches on bare make/model/nickname — those collide across generations.
 * @param {Array<object>} makes
 * @param {string} slug
 * @returns {{ make: object, model: object } | null}
 */
export function findCatalogModelByExactSlug(makes, slug) {
  const want = String(slug || "")
    .trim()
    .toLowerCase();
  if (!want || !Array.isArray(makes)) return null;
  for (const make of makes) {
    for (const model of make?.models || []) {
      if (model?.isActive === false) continue;
      if (String(model?.slug || "").trim().toLowerCase() === want) {
        return { make, model };
      }
    }
  }
  return null;
}

/**
 * Exact Car Catalog model match by nested model ObjectId.
 * @param {Array<object>} makes
 * @param {string} id
 */
export function findCatalogModelByExactId(makes, id) {
  const want = id != null ? String(id).trim() : "";
  if (!want || !Array.isArray(makes)) return null;
  for (const make of makes) {
    for (const model of make?.models || []) {
      if (model?.isActive === false) continue;
      const mid =
        model?._id != null ? String(model._id) : model?.id != null ? String(model.id) : "";
      if (mid && mid === want) return { make, model };
    }
  }
  return null;
}

/**
 * Apply catalog SEO fields onto a vehicle page payload.
 * Long Description from catalog wins when non-empty; never invent sibling copy.
 */
export function mergeCatalogCopyOntoVehicle(vehicle, model) {
  if (!vehicle || typeof vehicle !== "object") return vehicle;
  if (!model || typeof model !== "object") return vehicle;

  const description = String(model.description || "").trim();
  const popularAccessories = Array.isArray(model.popularAccessories)
    ? model.popularAccessories.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const nickname = String(model.nickname || "").trim();

  return {
    ...vehicle,
    // Only the catalog row's description — empty means page may use short meta fallback.
    description,
    popularAccessories: popularAccessories.length
      ? popularAccessories
      : Array.isArray(vehicle.popularAccessories)
        ? vehicle.popularAccessories
        : [],
    nickname: nickname || String(vehicle.nickname || "").trim() || "",
    image:
      resolveVehicleImageUrl(vehicle.image, vehicle.slug) ||
      resolveVehicleImageUrl(model.image, model.slug) ||
      "",
    catalogModelSlug:
      String(model.slug || "").trim().toLowerCase() ||
      String(vehicle.catalogModelSlug || "").trim().toLowerCase() ||
      "",
  };
}
