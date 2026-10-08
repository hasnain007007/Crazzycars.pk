/**
 * Vehicle page data helpers — products for a generation slug.
 */
import CarCatalog from "@/lib/models/CarCatalog.model";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import {
  findCatalogModelByExactSlug,
  mediaImageUrl,
  mergeCatalogCopyOntoVehicle,
} from "@/lib/carCatalogCopy";

const ACTIVE = { $regex: /^active$/i };

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanVehicleModelName(makeName, modelName) {
  const make = String(makeName || "").trim();
  let model = String(modelName || "").trim();
  if (!model) return model;
  if (make) {
    model = model.replace(new RegExp(`^${escapeRegex(make)}\\s+`, "i"), "").trim() || model;
  }
  return model;
}

/**
 * Ensure a Vehicle doc exists for a Car Catalog make/model row.
 * Prefer existing slug / catalogModelSlug matches; create when missing.
 */
export async function ensureVehicleFromCatalog(makeDoc, modelDoc) {
  if (!makeDoc || !modelDoc) return null;
  const makeName = String(makeDoc.name || "").trim();
  const modelName = cleanVehicleModelName(makeName, modelDoc.name);
  const catalogSlug = String(modelDoc.slug || "")
    .trim()
    .toLowerCase();
  if (!makeName || !modelName || !catalogSlug) return null;

  const years = Array.isArray(modelDoc.years) ? [...modelDoc.years].sort((a, b) => a - b) : [];
  const yearFrom =
    modelDoc.yearFrom != null
      ? Number(modelDoc.yearFrom)
      : years.length
        ? years[0]
        : new Date().getFullYear();
  const yearTo =
    modelDoc.yearTo != null
      ? Number(modelDoc.yearTo)
      : years.length
        ? years[years.length - 1]
        : null;

  const generation = String(modelDoc.generation || modelDoc.nickname || "").trim();
  const displayName =
    generation && !String(modelName).toLowerCase().includes(generation.toLowerCase())
      ? `${makeName} ${modelName} (${generation})`
      : `${makeName} ${modelName}${yearFrom ? ` (${yearFrom}${yearTo ? `–${yearTo}` : "+"})` : ""}`;

  const imageUrl = mediaImageUrl(modelDoc.image);

  let vehicle =
    (await Vehicle.findOne({ slug: catalogSlug }).lean()) ||
    (await Vehicle.findOne({ catalogModelSlug: catalogSlug, isActive: true }).lean()) ||
    (await Vehicle.findOne({
      make: new RegExp(`^${escapeRegex(makeName)}$`, "i"),
      model: new RegExp(`^${escapeRegex(modelName)}$`, "i"),
      yearFrom,
      isActive: true,
    }).lean());

  if (vehicle) {
    const patch = {};
    if (!vehicle.catalogModelSlug) patch.catalogModelSlug = catalogSlug;
    if (!mediaImageUrl(vehicle.image) && imageUrl) patch.image = imageUrl;
    if (Object.keys(patch).length) {
      await Vehicle.updateOne({ _id: vehicle._id }, { $set: patch });
      vehicle = { ...vehicle, ...patch };
    }
    return normalizeVehicleImage(vehicle);
  }

  try {
    const created = await Vehicle.create({
      make: makeName,
      model: modelName,
      generation,
      displayName,
      yearFrom,
      yearTo,
      slug: catalogSlug,
      catalogModelSlug: catalogSlug,
      image: imageUrl,
      metaTitle: `${makeName} ${modelName} Accessories | CrazzyCars.pk`,
      metaDescription: `Shop ${makeName} ${modelName} accessories in Pakistan. Cash on Delivery.`,
      isActive: true,
    });
    return normalizeVehicleImage(created.toObject());
  } catch (err) {
    // Race on unique slug — re-read
    const again = await Vehicle.findOne({ slug: catalogSlug }).lean();
    return again ? normalizeVehicleImage(again) : null;
  }
}

function normalizeVehicleImage(vehicle) {
  if (!vehicle) return null;
  return {
    ...vehicle,
    image: mediaImageUrl(vehicle.image),
  };
}

export async function loadVehicleBySlug(slugStr) {
  const slug = String(slugStr || "").trim().toLowerCase();
  if (!slug) return null;

  let vehicle =
    (await Vehicle.findOne({ slug, isActive: true }).lean()) ||
    (await Vehicle.findOne({ catalogModelSlug: slug, isActive: true }).lean());

  if (vehicle) {
    // Enrich image / catalog copy when Vehicle.image is an object or empty
    const makes = await CarCatalog.find({ isActive: true }).lean();
    const hit = findCatalogModelByExactSlug(makes, slug) ||
      findCatalogModelByExactSlug(makes, vehicle.catalogModelSlug || vehicle.slug);
    if (hit) {
      return mergeCatalogCopyOntoVehicle(normalizeVehicleImage(vehicle), hit.model);
    }
    return normalizeVehicleImage(vehicle);
  }

  // Catalog-only slug: materialize Vehicle so /cars/[slug] works
  const makes = await CarCatalog.find({ isActive: true }).lean();
  const hit = findCatalogModelByExactSlug(makes, slug);
  if (!hit) return null;
  return ensureVehicleFromCatalog(hit.make, hit.model);
}

export async function loadProductsForVehicle(vehicleId, { limit = 48 } = {}) {
  if (!vehicleId) return [];
  const products = await Product.find({
    status: ACTIVE,
    $or: [{ compatibleVehicles: vehicleId }, { isUniversal: true }],
  })
    .select(
      "name slug media pricing inventory status featured newArrival categories isUniversal rating reviewCount shortDescription createdAt"
    )
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return products;
}

export function serializeVehicleProduct(p) {
  const images = Array.isArray(p.media?.images) ? p.media.images : [];
  const main = images.find((i) => i.isMain) || images[0];
  const price = p.pricing?.salePrice ?? p.pricing?.regularPrice ?? 0;
  const compare = p.pricing?.salePrice != null ? p.pricing.regularPrice : null;
  return {
    id: String(p._id),
    _id: String(p._id),
    name: p.name,
    slug: p.slug,
    href: `/${p.slug}`,
    image: main?.url || "",
    price,
    compareAtPrice: compare,
    inStock: Number(p.inventory?.quantity || 0) > 0,
    isUniversal: Boolean(p.isUniversal),
  };
}

/** Slugs that have ≥1 active linked product (for homepage carousel filtering). */
export async function vehicleSlugsWithStorefrontProducts() {
  const rows = await Product.aggregate([
    { $match: { status: ACTIVE, compatibleVehicles: { $exists: true, $ne: [] } } },
    { $unwind: "$compatibleVehicles" },
    { $group: { _id: "$compatibleVehicles" } },
  ]);
  if (!rows.length) return new Set();
  const vehicles = await Vehicle.find({
    _id: { $in: rows.map((r) => r._id) },
    isActive: true,
  })
    .select("slug catalogModelSlug")
    .lean();
  const set = new Set();
  for (const v of vehicles) {
    if (v.slug) set.add(String(v.slug).trim());
    if (v.catalogModelSlug) set.add(String(v.catalogModelSlug).trim());
  }
  return set;
}

/** Flat list for /cars index — active vehicles with usable images. */
export async function loadShopByCarIndex() {
  const vehicles = await Vehicle.find({ isActive: true })
    .sort({ make: 1, sortOrder: 1, model: 1, yearFrom: 1 })
    .lean();

  // Prefer catalog images when Vehicle.image is missing/wrong object
  const makes = await CarCatalog.find({ isActive: true }).lean();
  const bySlug = new Map();
  for (const make of makes) {
    for (const model of make.models || []) {
      if (model?.isActive === false) continue;
      const s = String(model.slug || "").trim().toLowerCase();
      if (s) bySlug.set(s, { make, model });
    }
  }

  return vehicles.map((v) => {
    const slug = String(v.slug || "").trim().toLowerCase();
    const hit = bySlug.get(slug) || bySlug.get(String(v.catalogModelSlug || "").trim().toLowerCase());
    const image =
      mediaImageUrl(v.image) ||
      (hit ? mediaImageUrl(hit.model.image) : "") ||
      "";
    return {
      _id: v._id,
      make: v.make,
      model: v.model,
      generation: v.generation || "",
      nickname: hit?.model?.nickname || "",
      displayName: v.displayName,
      yearFrom: v.yearFrom,
      yearTo: v.yearTo,
      slug: v.slug,
      image,
    };
  });
}
