import { effectiveUnitPrice } from "@/lib/storePricing";
import { serializeStoreOption } from "@/lib/variationOptions";

function mainImage(product) {
  const imgs = product?.media?.images || [];
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || "";
}

export function serializeStoreProductSummary(p) {
  const price = effectiveUnitPrice(p);
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    image: mainImage(p),
    price,
    compareAt: Number(p.pricing?.regularPrice) || price,
    featured: !!p.featured,
    newArrival: !!p.newArrival,
    inStock: !p.inventory?.trackInventory || (Number(p.inventory?.quantity) || 0) > 0,
  };
}

export function serializeStoreProductDetail(p) {
  const price = effectiveUnitPrice(p);
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    articleNo: p.articleNo || "",
    shortDescription: p.shortDescription || "",
    longDescription: p.longDescription || "",
    price,
    compareAt: Number(p.pricing?.regularPrice) || price,
    images: (p.media?.images || []).map((i) => ({ url: i.url || "", isMain: !!i.isMain })),
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
    inStock: !p.inventory?.trackInventory || (Number(p.inventory?.quantity) || 0) > 0,
    quantityAvailable: Number(p.inventory?.quantity) || 0,
    trackInventory: !!p.inventory?.trackInventory,
    shippingBaseWeight: Number(p.inventory?.weight) || 0,
    shippingBaseWeightUnit: p.inventory?.weightUnit || "kg",
    features: p.features || [],
  };
}
