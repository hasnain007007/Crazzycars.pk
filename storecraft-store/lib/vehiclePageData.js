/**
 * Vehicle page data helpers — products for a generation slug.
 */
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";

const ACTIVE = { $regex: /^active$/i };

export async function loadVehicleBySlug(slugStr) {
  return Vehicle.findOne({ slug: String(slugStr || "").trim().toLowerCase(), isActive: true }).lean();
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
