import { productAllowsCod } from "@/lib/codEligibility";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";
import { serializeStoreOption } from "@/lib/variationOptions";
import { combinationSignature } from "@/lib/variantMatrix";
import { sanitizeProductHtml, toPlainText } from "@/lib/sanitizeHtml";

function productDocId(p) {
  if (p?._id != null) return String(p._id);
  if (p?.id != null) return String(p.id);
  return "";
}

function getStock(product) {
  return (
    Number(product?.inventory?.quantity) ||
    Number(product?.inventory?.stock) ||
    Number(product?.stock) ||
    0
  );
}

function isInStock(product) {
  if (product?.inventory?.trackInventory === false) {
    return true;
  }
  // Opt-in only — must match checkout allowsBackorder() or customers buy then fail at place-order.
  if (product?.inventory?.allowBackorder === true) {
    return true;
  }
  return getStock(product) > 0;
}

function productRequiresOptions(p) {
  const hasAxes = (p?.simpleVariations || []).some(
    (v) => v?.enabled && Array.isArray(v.tags) && v.tags.length > 0
  );
  const hasCombos = Array.isArray(p?.variationCombinations) && p.variationCombinations.length > 0;
  const hasLegacy =
    Array.isArray(p?.variations) &&
    p.variations.some((v) => Array.isArray(v?.options) && v.options.length > 0);
  const hasMatrix =
    Array.isArray(p?.variationTypes) &&
    p.variationTypes.length > 0 &&
    Array.isArray(p?.variants) &&
    p.variants.length > 0;
  return (hasAxes && hasCombos) || hasLegacy || hasMatrix;
}

function mainImage(product) {
  const imgs = product?.media?.images || [];
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || "";
}

function serializeMediaVideos(videos) {
  if (!Array.isArray(videos)) return [];
  return videos
    .map((video) => ({
      url: String(video?.url || "").trim(),
      originalUrl: String(video?.originalUrl || "").trim(),
      publicId: String(video?.publicId || "").trim(),
      thumbnail: String(video?.thumbnail || "").trim(),
      format: String(video?.format || "webm").trim() || "webm",
      duration: Math.max(0, Number(video?.duration) || 0),
      size: Math.max(0, Number(video?.size) || 0),
      width: Math.max(0, Number(video?.width) || 0),
      height: Math.max(0, Number(video?.height) || 0),
      title: String(video?.title || "").trim(),
      isPrimary: Boolean(video?.isPrimary),
    }))
    .filter((video) => video.url);
}

export function serializeStoreProductSummary(p, opts = {}) {
  const regularPrice = Number(p.pricing?.regularPrice) || 0;
  const salePrice = Number(p.pricing?.salePrice) || 0;
  const schedule = p.pricing?.saleSchedule || null;
  const isOnSale = salePrice > 0 && salePrice < regularPrice && isSaleCurrentlyActive(p.pricing);
  const price = isOnSale ? salePrice : effectiveUnitPrice(p) || regularPrice;
  const stock = getStock(p);
  const inStock = isInStock(p);
  const rawImgs = Array.isArray(p?.media?.images) ? p.media.images : [];
  const maxImages = Number.isFinite(Number(opts.maxImages))
    ? Math.max(1, Number(opts.maxImages))
    : rawImgs.length;
  const mainFirst = [
    rawImgs.find((i) => i?.isMain),
    ...rawImgs.filter((i) => !i?.isMain),
  ].filter(Boolean);
  const mediaImages = mainFirst.slice(0, maxImages || rawImgs.length);
  const summaryImage =
    mediaImages.find((i) => i?.isMain)?.url ||
    mediaImages[0]?.url ||
    rawImgs.find((i) => i?.isMain)?.url ||
    rawImgs[0]?.url ||
    null;
  const summaryImages = mediaImages.map((i) => i?.url).filter(Boolean);
  return {
    id: productDocId(p),
    name: p.name,
    slug: p.slug,
    articleNo: p.articleNo || p.inventory?.sku || "",
    shortDescription: toPlainText(p.shortDescription || ""),
    image: summaryImage,
    images: summaryImages,
    media: {
      images: mediaImages.map((i) => ({ url: i?.url || "", isMain: !!i?.isMain, altText: i?.altText || "" })),
    },
    price,
    regularPrice,
    salePrice,
    compareAt: regularPrice || price,
    saleSchedule: schedule,
    isOnSale,
    featured: !!p.featured,
    newArrival: !!p.newArrival,
    codEnabled: productAllowsCod(p),
    advancePercentRequired: Math.min(100, Math.max(0, Number(p.advancePercentRequired) || 0)),
    createdAt: p.createdAt || null,
    categories: Array.isArray(p.categories)
      ? p.categories
          .map((c) =>
            typeof c === "object" && c
              ? { id: c._id?.toString?.() || c.id, name: c.name, slug: c.slug }
              : null
          )
          .filter((c) => c?.name)
      : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    inStock,
    stock,
    quantity: stock,
    quantityAvailable: stock,
    inventory: {
      ...(p.inventory || {}),
      quantity: Number(p?.inventory?.quantity) || 0,
      trackInventory: p?.inventory?.trackInventory ?? true,
      allowBackorder: p?.inventory?.allowBackorder === true,
      sku: p?.inventory?.sku || p.articleNo || "",
    },
    requiresOptions: productRequiresOptions(p),
    rating: Number(p?.rating) || 0,
    averageRating: Number(p?.averageRating) || 0,
    ratingAverage: Number(p?.ratingAverage) || 0,
    reviewCount: Number(p?.reviewCount) || 0,
    totalReviews: Number(p?.totalReviews) || 0,
    numReviews: Number(p?.numReviews) || 0,
  };
}

/** Active catalog products for PDP quick-add. Empty when nothing was linked. */
export function serializeRecommendedProducts(docs, { excludeId = "" } = {}) {
  const skip = String(excludeId || "");
  return (Array.isArray(docs) ? docs : [])
    .filter((row) => row && typeof row === "object" && row.slug)
    .filter((row) => String(row.status || "active").toLowerCase() === "active")
    .filter((row) => !skip || productDocId(row) !== skip)
    .slice(0, 6)
    .map((row) => serializeStoreProductSummary(row));
}

function serializeVariantForStore(v) {
  if (!v) return null;
  const comb = Array.isArray(v.combination) ? v.combination.map((x) => String(x ?? "").trim()) : [];
  if (!comb.length) return null;
  return {
    id: v._id != null ? String(v._id) : combinationSignature(comb),
    combination: comb,
    price: Math.max(0, Number(v.price) || 0),
    compareAtPrice: Math.max(0, Number(v.compareAtPrice) || 0),
    weight: Math.max(0, Number(v.weight) || 0),
    weightUnit: v.weightUnit || "kg",
    additionalShippingWeight: Math.max(0, Number(v.additionalShippingWeight) || 0),
    shippingPriceSurcharge: Math.max(0, Number(v.shippingPriceSurcharge) || 0),
    stock: Math.max(0, Number(v.stock) || 0),
    sku: v.sku || "",
    trackStock: v.trackStock !== false,
    isAvailable: v.isAvailable !== false,
    image: v.image?.url ? { url: v.image.url, publicId: v.image.publicId || "" } : null,
  };
}

export function serializeStoreProductDetail(p) {
  const regularPrice = Number(p.pricing?.regularPrice) || 0;
  const salePrice = Number(p.pricing?.salePrice) || 0;
  const schedule = p.pricing?.saleSchedule || null;
  const isOnSale = salePrice > 0 && salePrice < regularPrice && isSaleCurrentlyActive(p.pricing);
  const price = isOnSale ? salePrice : effectiveUnitPrice(p) || regularPrice;
  const variationTypes = (p.variationTypes || [])
    .map((t, idx) => ({
      id: t._id != null ? String(t._id) : `vt-${idx}`,
      name: t.name || "",
      type: t.type || "custom",
      position: Number(t.position) || idx + 1,
    }))
    .sort((a, b) => a.position - b.position);
  const serializedVariants = (p.variants || []).map(serializeVariantForStore).filter(Boolean);
  const usesVariantMatrix = variationTypes.length > 0 && serializedVariants.length > 0;
  const stock = Number(p?.inventory?.quantity) || 0;
  const inStock =
    p?.inventory?.trackInventory === false || p?.inventory?.allowBackorder === true
      ? true
      : stock > 0;

  return {
    id: productDocId(p),
    name: p.name,
    slug: p.slug,
    articleNo: p.articleNo || "",
    ean: p.ean || "",
    partNumber: p.partNumber || "",
    condition: p.condition || "new",
    vendor: p.vendor || "",
    shortDescription: toPlainText(p.shortDescription || ""),
    longDescription: sanitizeProductHtml(p.longDescription || ""),
    descriptionHtml: sanitizeProductHtml(p.longDescription || p.descriptionHtml || ""),
    price,
    regularPrice,
    salePrice,
    compareAt: regularPrice || price,
    saleSchedule: schedule,
    isOnSale,
    images: (p.media?.images || []).map((i) => ({ url: i.url || "", isMain: !!i.isMain, altText: i.altText || "" })),
    media: {
      images: (p.media?.images || []).map((i) => ({ url: i.url || "", isMain: !!i.isMain, altText: i.altText || "" })),
      videos: serializeMediaVideos(p.media?.videos),
    },
    videos: serializeMediaVideos(p.media?.videos),
    videoUrl: p.media?.videoUrl || "",
    videoType: p.media?.videoType || "",
    usesVariantMatrix,
    variationTypes,
    variationOptions: (p.variationOptions || []).map((o, idx) => ({
      id: o._id != null ? String(o._id) : `vo-${idx}`,
      typeName: o.typeName || "",
      value: o.value || "",
      position: Number(o.position) || idx + 1,
    })),
    variants: serializedVariants,
    simpleVariations: Array.isArray(p.simpleVariations) ? p.simpleVariations : [],
    variationCombinations: Array.isArray(p.variationCombinations)
      ? p.variationCombinations.map((c) => ({
          _id: c._id != null ? String(c._id) : undefined,
          options: Array.isArray(c.options)
            ? c.options.map((o) => ({
                name: String(o?.name || "").trim(),
                value: String(o?.value || "").trim(),
              }))
            : [],
          price: Math.max(0, Number(c.price) || 0),
          compareAtPrice: Math.max(0, Number(c.compareAtPrice) || 0),
          priceDelta: Number(c.priceDelta) || 0,
          weight: Math.max(0, Number(c.weight) || 0),
          weightDelta: Number(c.weightDelta) || 0,
          stock: Math.max(0, Number(c.stock) || 0),
          sku: c.sku || "",
          image:
            typeof c.image === "string"
              ? c.image
              : c.image?.url
                ? String(c.image.url)
                : "",
        }))
      : [],
    variations: (p.variations || []).map((v, idx) => ({
      id: v._id != null ? String(v._id) : `var-${idx}`,
      type: v.type,
      name: v.name || v.type,
      options: (v.options || []).map((o) => serializeStoreOption(o)).filter(Boolean),
      extraPrice: Number(v.additionalPrice ?? v.extraPrice) || 0,
    })),
    categories: Array.isArray(p.categories)
      ? p.categories.map((c) => (typeof c === "object" && c?.slug ? { id: c._id?.toString(), name: c.name, slug: c.slug } : null)).filter(Boolean)
      : [],
    inStock,
    quantityAvailable: stock,
    stock,
    trackInventory: p?.inventory?.trackInventory ?? true,
    allowBackorder: p?.inventory?.allowBackorder === true,
    shippingBaseWeight: Number(p.inventory?.weight) || 0,
    shippingBaseWeightUnit: p.inventory?.weightUnit || "kg",
    seo: p.seo || {},
    averageRating: Number(p.averageRating) || Number(p.ratingAverage) || Number(p.rating) || 0,
    reviewCount: Number(p.reviewCount) || Number(p.totalReviews) || Number(p.numReviews) || 0,
    features: p.features || [],
    specifications: Array.isArray(p.specifications) ? p.specifications.filter((s) => s.label && s.value) : [],
    codEnabled: productAllowsCod(p),
    advancePercentRequired: Math.min(100, Math.max(0, Number(p.advancePercentRequired) || 0)),
    addOns: Array.isArray(p.addOns)
      ? p.addOns.map((a) => ({
          name: a?.name || "",
          price: Number(a?.price) || 0,
          required: Boolean(a?.required),
        }))
      : [],
    recommendedProducts: serializeRecommendedProducts(p.recommendedProducts, {
      excludeId: productDocId(p),
    }),
    customSizing: {
      enabled: Boolean(p.customSizing?.enabled),
      title: p.customSizing?.title || "Enter Your Measurements",
      description: p.customSizing?.description || "Enter your measurements for a perfect fit",
      unit: ["cm", "inches", "both"].includes(p.customSizing?.unit) ? p.customSizing.unit : "cm",
      fields: Array.isArray(p.customSizing?.fields)
        ? p.customSizing.fields
            .map((f) => ({
              fieldName: f.fieldName || "",
              label: f.label || "",
              placeholder: f.placeholder || "",
              required: f.required !== false,
              minValue: f.minValue ?? null,
              maxValue: f.maxValue ?? null,
              helpText: f.helpText || "",
            }))
            .filter((f) => f.fieldName && f.label)
        : [],
    },
    isUniversal: Boolean(p.isUniversal),
    compatibleCars: Array.isArray(p.compatibleCars)
      ? p.compatibleCars.map((c) => ({
          make: c?.make || "",
          model: c?.model || "",
          generation: c?.generation || "",
          yearFrom: c?.yearFrom ?? null,
          yearTo: c?.yearTo ?? null,
        }))
      : [],
    vehicleCompatibility: p.vehicleCompatibility
      ? {
          fitmentType: p.vehicleCompatibility.fitmentType || "universal",
          universalNote: p.vehicleCompatibility.universalNote || "",
          categories: Array.isArray(p.vehicleCompatibility.categories)
            ? p.vehicleCompatibility.categories.map((c) => String(c || "")).filter(Boolean)
            : [],
          vehicles: Array.isArray(p.vehicleCompatibility.vehicles)
            ? p.vehicleCompatibility.vehicles.map((v) => ({
                make: v?.make || "",
                model: v?.model || "",
                yearFrom: v?.yearFrom ?? null,
                yearTo: v?.yearTo ?? null,
                bodyStyle: v?.bodyStyle || "All",
                notes: v?.notes || "",
              }))
            : [],
        }
      : null,
  };
}
