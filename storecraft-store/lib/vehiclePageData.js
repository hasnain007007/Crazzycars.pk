/**
 * Vehicle page data helpers — products for a generation slug.
 */
import CarCatalog from "@/lib/models/CarCatalog.model";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { activeProductStatusFilter } from "@/lib/productVehicleQuery";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Clean catalog model labels like "toyota mark X" → "Mark X". */
export function cleanVehicleModelName(makeName, modelName) {
  let model = String(modelName || "").trim();
  const make = String(makeName || "").trim();
  if (!model) return model;
  if (make) {
    const prefix = new RegExp(`^${escapeRegex(make)}\\s+`, "i");
    model = model.replace(prefix, "").trim();
  }
  return model.replace(/\s+/g, " ").trim() || String(modelName || "").trim();
}

function buildVehicleSlug(makeName, modelName, yearFrom, generation, catalogSlug) {
  const makeSlug = slugify(makeName);
  const cleanedModel = cleanVehicleModelName(makeName, modelName);
  const fromCatalog = slugify(catalogSlug || "");
  if (fromCatalog && (fromCatalog.startsWith(`${makeSlug}-`) || fromCatalog.includes(makeSlug))) {
    return fromCatalog;
  }
  const parts = [makeName, cleanedModel, yearFrom];
  if (generation) parts.push(generation);
  return slugify(parts.filter(Boolean).join("-")) || slugify(`${makeName}-${cleanedModel}-${yearFrom}`);
}

/**
 * Find or create the Vehicle that powers /cars/[slug] from a Car Catalog model.
 */
export async function ensureVehicleFromCatalog(make, model) {
  const makeName = String(make?.name || "").trim();
  const rawModelName = String(model?.name || model?.model || "").trim();
  const modelName = cleanVehicleModelName(makeName, rawModelName);
  const yearsArr = Array.isArray(model?.years)
    ? model.years.map(Number).filter((n) => Number.isFinite(n))
    : [];
  const yearFrom =
    Number(model?.yearFrom) ||
    (yearsArr.length ? Math.min(...yearsArr) : 0) ||
    new Date().getFullYear() - 10;
  let yearToFinal = null;
  if (model?.yearTo != null && model.yearTo !== "") {
    yearToFinal = Number(model.yearTo);
  } else if (yearsArr.length) {
    yearToFinal = Math.max(...yearsArr);
  }
  if (!Number.isFinite(yearToFinal)) yearToFinal = null;
  const generation = String(model?.generation || model?.nickname || "").trim();
  const catalogModelSlug = slugify(model?.slug || "");
  const slug = buildVehicleSlug(makeName, modelName, yearFrom, generation, catalogModelSlug);
  const displayName = generation
    ? `${makeName} ${modelName} ${generation}`
    : `${makeName} ${modelName}${yearFrom ? ` (${yearFrom}${yearToFinal ? `–${yearToFinal}` : "+"})` : ""}`;

  let vehicle =
    (catalogModelSlug
      ? await Vehicle.findOne({ catalogModelSlug, isActive: true }).lean()
      : null) ||
    (await Vehicle.findOne({ slug, isActive: true }).lean()) ||
    (await Vehicle.findOne({
      make: new RegExp(`^${escapeRegex(makeName)}$`, "i"),
      model: new RegExp(`^${escapeRegex(modelName)}$`, "i"),
      yearFrom,
      ...(generation
        ? { generation: new RegExp(`^${escapeRegex(generation)}$`, "i") }
        : {}),
    }).lean());

  if (!vehicle) {
    // Also match older bad labels where generation was stored as model.
    if (generation) {
      vehicle = await Vehicle.findOne({
        make: new RegExp(`^${escapeRegex(makeName)}$`, "i"),
        model: new RegExp(`^${escapeRegex(generation)}$`, "i"),
        yearFrom,
      }).lean();
    }
  }

  if (!vehicle) {
    const created = await Vehicle.create({
      make: makeName,
      model: modelName,
      generation,
      displayName,
      yearFrom,
      yearTo: yearToFinal,
      slug,
      catalogModelSlug,
      image: model?.image || "",
      isActive: model?.isActive !== false,
      sortOrder: Number(model?.popularOrder) || 0,
    });
    vehicle = created.toObject();
  } else if (catalogModelSlug && !vehicle.catalogModelSlug) {
    await Vehicle.updateOne({ _id: vehicle._id }, { $set: { catalogModelSlug } });
    vehicle = { ...vehicle, catalogModelSlug };
  }

  return vehicle;
}

async function resolveFromCarCatalogSlug(slug) {
  const want = String(slug || "").trim().toLowerCase();
  if (!want) return null;
  const make = await CarCatalog.findOne({
    isActive: true,
    "models.slug": want,
  }).lean();
  if (!make) return null;
  const model = (make.models || []).find(
    (m) => String(m.slug || "").toLowerCase() === want && m.isActive !== false
  );
  if (!model) return null;
  return ensureVehicleFromCatalog(make, model);
}

/**
 * Resolve active vehicle by Vehicle.slug OR Car Catalog model.slug (auto-creates Vehicle).
 */
export async function loadVehicleBySlug(slugStr) {
  const slug = String(slugStr || "").trim().toLowerCase();
  if (!slug) return null;

  let vehicle = await Vehicle.findOne({ slug, isActive: true }).lean();
  if (vehicle) return vehicle;

  vehicle = await Vehicle.findOne({ catalogModelSlug: slug, isActive: true }).lean();
  if (vehicle) return vehicle;

  return resolveFromCarCatalogSlug(slug);
}

function modelNameAliases(vehicle) {
  const make = String(vehicle?.make || "").trim();
  const model = String(vehicle?.model || "").trim();
  const generation = String(vehicle?.generation || "").trim();
  const cleaned = cleanVehicleModelName(make, model);
  const aliases = [model, cleaned, generation];
  // "toyota mark X" / Mark X variants
  if (/mark\s*x/i.test(`${model} ${cleaned} ${generation}`)) {
    aliases.push("Mark X", "mark x", "toyota mark x", "1 Gen(X120)", "1 Gen (X120)");
  }
  return [...new Set(aliases.map((a) => String(a || "").trim()).filter(Boolean))];
}

/**
 * Products for a vehicle page: ObjectId links + legacy make/model fitment rows.
 */
export async function loadProductsForVehicle(vehicleOrId, { limit = 200 } = {}) {
  if (!vehicleOrId) return [];

  let vehicle = vehicleOrId;
  if (typeof vehicleOrId !== "object" || !vehicleOrId.make) {
    vehicle = await Vehicle.findById(vehicleOrId).lean();
  }
  if (!vehicle?._id) return [];

  const aliases = modelNameAliases(vehicle);
  const makeRx = new RegExp(`^${escapeRegex(vehicle.make)}$`, "i");
  const or = [{ compatibleVehicles: vehicle._id }];

  for (const alias of aliases) {
    const modelRx = new RegExp(escapeRegex(alias), "i");
    or.push({
      compatibleCars: { $elemMatch: { make: makeRx, model: modelRx } },
    });
    or.push({
      "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] },
      "vehicleCompatibility.vehicles": { $elemMatch: { make: makeRx, model: modelRx } },
    });
  }

  // Last-resort for Mark X products that only mention the car in the title.
  if (/mark\s*x/i.test(`${vehicle.model} ${vehicle.displayName || ""}`)) {
    or.push({ name: /mark\s*x/i });
  }

  const products = await Product.find({
    ...activeProductStatusFilter(),
    $or: or,
  })
    .select(
      "name slug media pricing inventory status featured newArrival categories isUniversal rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt"
    )
    .populate("categories", "name slug")
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return products;
}

export function serializeVehicleProduct(p) {
  const images = Array.isArray(p.media?.images) ? p.media.images : [];
  const main = images.find((i) => i.isMain) || images[0];
  const regular = Number(p.pricing?.regularPrice) || 0;
  const onSale = isSaleCurrentlyActive(p.pricing);
  const price = effectiveUnitPrice(p) || regular;
  const compare = onSale && regular > price ? regular : null;
  const salePrice = onSale ? Number(p.pricing?.salePrice) || 0 : 0;
  return {
    id: String(p._id),
    _id: String(p._id),
    name: p.name,
    slug: p.slug,
    href: `/${p.slug}`,
    image: main?.url || "",
    images: images.map((i) => i?.url).filter(Boolean),
    media: { images: images.map((i) => ({ url: i?.url || "", isMain: !!i?.isMain })) },
    price,
    compareAtPrice: compare,
    compareAt: compare || regular,
    salePrice,
    regularPrice: regular,
    isOnSale: onSale,
    featured: Boolean(p.featured),
    newArrival: Boolean(p.newArrival),
    createdAt: p.createdAt || null,
    shortDescription: p.shortDescription || "",
    articleNo: p.articleNo || p.inventory?.sku || "",
    categories: Array.isArray(p.categories)
      ? p.categories
          .map((c) =>
            typeof c === "object" && c
              ? { id: c._id?.toString?.(), name: c.name, slug: c.slug }
              : null
          )
          .filter((c) => c?.name)
      : [],
    rating: Number(p.rating) || 0,
    averageRating: Number(p.averageRating) || Number(p.ratingAverage) || Number(p.rating) || 0,
    reviewCount: Number(p.reviewCount) || Number(p.totalReviews) || Number(p.numReviews) || 0,
    inventory: p.inventory || {},
    inStock:
      Number(p.inventory?.quantity || 0) > 0 || p.inventory?.allowBackorder === true,
    isUniversal: Boolean(p.isUniversal),
  };
}
