import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { productSlugCandidates } from "@/lib/productSlugParam";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusFilter(statuses) {
  const list = Array.isArray(statuses) && statuses.length ? statuses : ["active"];
  return list.length === 1 ? list[0] : { $in: list };
}

async function findExactOrCi(key, statuses, select) {
  const status = statusFilter(statuses);
  const exact = await Product.findOne({ slug: key, status }).select(select).lean();
  if (exact) return exact;
  return Product.findOne({
    slug: { $regex: `^${escapeRegex(key)}$`, $options: "i" },
    status,
  })
    .select(select)
    .lean();
}

async function findPrefixOrYear(key, statuses, select) {
  const status = statusFilter(statuses);

  // Short Shopify handles that grew longer after migration
  // e.g. deal-5-complete-body-kit → deal-5-complete-body-kit-deal-front-...
  if (key.length >= 8) {
    const prefixHits = await Product.find({
      status,
      slug: { $regex: `^${escapeRegex(key)}(-|$)`, $options: "i" },
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

  // Year-range drift: honda-city-2021-2024-... → honda-city-2021-2026-...
  // Run on each candidate so `-crazzycars-pk` leftovers still resolve.
  if (/\d{4}-\d{4}/.test(key)) {
    const flex = escapeRegex(key).replace(/\d{4}-\d{4}/g, "\\d{4}-\\d{4}");
    const yearHits = await Product.find({
      status,
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

/**
 * Resolve a URL slug/handle to a product in the given statuses.
 *
 * Handles Shopify / Meta leftovers:
 * - exact slug
 * - `-crazzycars-pk` suffix added or removed after migration
 * - shortened handles that are a prefix of the current slug
 * - year-range drift (2021-2024 → 2021-2026) with same stem
 *
 * @returns {Promise<{ _id: unknown, slug: string, status?: string } | null>}
 */
export async function findProductBySlugParam(rawSlug, opts = {}) {
  const candidates = productSlugCandidates(rawSlug);
  if (!candidates.length) return null;

  await dbConnect();
  const select = opts.select || "_id slug status";
  const statuses = opts.statuses || ["active"];

  for (const key of candidates) {
    const hit = await findExactOrCi(key, statuses, select);
    if (hit) return hit;
  }
  for (const key of candidates) {
    const hit = await findPrefixOrYear(key, statuses, select);
    if (hit) return hit;
  }
  return null;
}

/** Resolve a URL slug/handle to an active product. */
export async function findActiveProductBySlugParam(rawSlug) {
  return findProductBySlugParam(rawSlug, { statuses: ["active"] });
}

/** Inactive catalog row — discontinued, not a draft/test SKU. */
export async function findUnavailableProductBySlugParam(rawSlug) {
  return findProductBySlugParam(rawSlug, { statuses: ["inactive"] });
}

/** Canonical PDP path for a slug param, or null if no active product matches. */
export async function canonicalProductPathForSlug(rawSlug) {
  const product = await findActiveProductBySlugParam(rawSlug);
  if (!product?.slug) return null;
  return `/${product.slug}`;
}
