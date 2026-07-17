import { effectiveUnitPrice } from "@/lib/storePricing";
import { serializeStoreOption } from "@/lib/variationOptions";
import { combinationSignature } from "@/lib/variantMatrix";

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
  return getStock(product) > 0;
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

export function serializeStoreProductSummary(p) {
  const regularPrice = Number(p.pricing?.regularPrice) || 0;
  const salePrice = Number(p.pricing?.salePrice) || 0;
  const schedule = p.pricing?.saleSchedule || null;
  const scheduleActive =
    !schedule?.enabled ||
    ((schedule?.startDate ? Date.now() >= new Date(schedule.startDate).getTime() : true) &&
      (schedule?.endDate ? Date.now() <= new Date(schedule.endDate).getTime() : true));
  const isOnSale = salePrice > 0 && salePrice < regularPrice && scheduleActive;
  const price = isOnSale ? salePrice : effectiveUnitPrice(p) || regularPrice;
  const stock = getStock(p);
  const inStock = isInStock(p);
  const summaryImage =
    p?.media?.images?.find((i) => i?.isMain)?.url ||
    p?.media?.images?.[0]?.url ||
    null;
  const summaryImages = Array.isArray(p?.media?.images)
    ? p.media.images.map((i) => i?.url).filter(Boolean)
    : [];
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    image: summaryImage,
    images: summaryImages,
    price,
    regularPrice,
    salePrice,
    compareAt: regularPrice || price,
    saleSchedule: schedule,
    isOnSale,
    featured: !!p.featured,
    newArrival: !!p.newArrival,
    inStock,
    stock,
    quantity: stock,
    quantityAvailable: stock,
    inventory: {
      ...(p.inventory || {}),
      quantity: Number(p?.inventory?.quantity) || 0,
      trackInventory: p?.inventory?.trackInventory ?? true,
    },
    rating: Number(p?.rating) || 0,
    averageRating: Number(p?.averageRating) || 0,
    ratingAverage: Number(p?.ratingAverage) || 0,
    reviewCount: Number(p?.reviewCount) || 0,
    totalReviews: Number(p?.totalReviews) || 0,
    numReviews: Number(p?.numReviews) || 0,
    reviews: Array.isArray(p?.reviews) ? p.reviews : [],
  };
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
  const scheduleActive =
    !schedule?.enabled ||
    ((schedule?.startDate ? Date.now() >= new Date(schedule.startDate).getTime() : true) &&
      (schedule?.endDate ? Date.now() <= new Date(schedule.endDate).getTime() : true));
  const isOnSale = salePrice > 0 && salePrice < regularPrice && scheduleActive;
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
    p?.inventory?.trackInventory === false
      ? true
      : stock > 0;

  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    articleNo: p.articleNo || "",
    shortDescription: p.shortDescription || "",
    longDescription: p.longDescription || "",
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
    variationCombinations: Array.isArray(p.variationCombinations) ? p.variationCombinations : [],
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
    shippingBaseWeight: Number(p.inventory?.weight) || 0,
    shippingBaseWeightUnit: p.inventory?.weightUnit || "kg",
    features: p.features || [],
    specifications: Array.isArray(p.specifications) ? p.specifications.filter((s) => s.label && s.value) : [],
    addOns: Array.isArray(p.addOns)
      ? p.addOns.map((a) => ({
          name: a?.name || "",
          price: Number(a?.price) || 0,
          required: Boolean(a?.required),
        }))
      : [],
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
  };
}
