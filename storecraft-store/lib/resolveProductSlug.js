import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve a URL slug/handle to an active product.
 *
 * Meta carousel ads still use Shopify-era handles that omit the
 * `-crazzycars-pk` suffix we added on migration. Exact slug miss → try
 * `${slug}-crazzycars-pk`, then case-insensitive match.
 *
 * @returns {Promise<{ _id: unknown, slug: string } | null>}
 */
export async function findActiveProductBySlugParam(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return null;

  await dbConnect();

  const select = "_id slug";
  const exact = await Product.findOne({ slug, status: "active" }).select(select).lean();
  if (exact) return exact;

  if (!/-crazzycars-pk$/i.test(slug)) {
    const withBrand = await Product.findOne({
      slug: `${slug}-crazzycars-pk`,
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

  if (!/-crazzycars-pk$/i.test(slug)) {
    const ciBrand = await Product.findOne({
      slug: { $regex: `^${escapeRegex(slug)}-crazzycars-pk$`, $options: "i" },
      status: "active",
    })
      .select(select)
      .lean();
    if (ciBrand) return ciBrand;
  }

  return null;
}

/** Canonical PDP path for a slug param, or null if no product matches. */
export async function canonicalProductPathForSlug(rawSlug) {
  const product = await findActiveProductBySlugParam(rawSlug);
  if (!product?.slug) return null;
  return `/${product.slug}`;
}
