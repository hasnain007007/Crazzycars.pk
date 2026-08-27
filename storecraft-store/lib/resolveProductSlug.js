import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgResolveProductSlug } from "@/lib/pg/catalog";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve a URL slug/handle to an active product.
 *
 * Handles Shopify / Meta leftovers:
 * - exact slug
 * - `-homefy-pk` suffix added on migration
 * - shortened handles that are a prefix of the current slug
 * - year-range drift (2021-2024 → 2021-2026) with same stem
 *
 * @returns {Promise<{ _id: unknown, slug: string } | null>}
 */
export async function findActiveProductBySlugParam(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return null;

  if (isPostgresCatalog()) {
    return pgResolveProductSlug(slug);
  }

  await dbConnect();

  const select = "_id slug";
  const exact = await Product.findOne({ slug, status: "active" }).select(select).lean();
  if (exact) return exact;

  if (!/-homefy-pk$/i.test(slug)) {
    const withBrand = await Product.findOne({
      slug: `${slug}-homefy-pk`,
      status: "active",
    })
      .select(select)
      .lean();
    if (withBrand) return withBrand;
  }

  const ci = await Product.findOne({
    slug: { $regex: `^${escapeRegex(slug)}$`, $options: "i" },
    status: "active",
  })
    .select(select)
    .lean();
  if (ci) return ci;

  if (!/-homefy-pk$/i.test(slug)) {
    const ciBrand = await Product.findOne({
      slug: { $regex: `^${escapeRegex(slug)}-homefy-pk$`, $options: "i" },
      status: "active",
    })
      .select(select)
      .lean();
    if (ciBrand) return ciBrand;
  }

  // Short Shopify handles that grew longer after migration
  // e.g. deal-5-complete-body-kit → deal-5-complete-body-kit-deal-front-...
  if (slug.length >= 8) {
    const prefixHits = await Product.find({
      status: "active",
      slug: { $regex: `^${escapeRegex(slug)}(-|$)`, $options: "i" },
    })
      .select(select)
      .limit(8)
      .lean();
    if (prefixHits.length === 1) return prefixHits[0];
    if (prefixHits.length > 1) {
      prefixHits.sort((a, b) => String(a.slug).length - String(b.slug).length);
      return prefixHits[0];
    }
  }

  // Year-range drift: honda-city-2021-2024-carbon-fiber-steering-wheel
  // → honda-city-2021-2026-carbon-fiber-steering-wheel-...
  if (/\d{4}-\d{4}/.test(slug)) {
    const flex = escapeRegex(slug).replace(/\d{4}-\d{4}/g, "\\d{4}-\\d{4}");
    const yearHits = await Product.find({
      status: "active",
      slug: { $regex: `^${flex}`, $options: "i" },
    })
      .select(select)
      .limit(8)
      .lean();
    if (yearHits.length === 1) return yearHits[0];
    if (yearHits.length > 1) {
      yearHits.sort((a, b) => String(a.slug).length - String(b.slug).length);
      return yearHits[0];
    }
  }

  return null;
}

/** Canonical PDP path for a slug param, or null if no product matches. */
export async function canonicalProductPathForSlug(rawSlug) {
  const product = await findActiveProductBySlugParam(rawSlug);
  if (!product?.slug) return null;
  return `/${product.slug}`;
}
