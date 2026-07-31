/**
 * Product catalog search: smart phrase/type ranking with MongoDB $text recall,
 * SKU prefix match, and regex fallback.
 */
import { queryProductsSmart } from "@/lib/smartProductSearch";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildProductRegexOr(q) {
  const term = String(q || "").trim();
  if (!term) return null;
  const rx = new RegExp(escapeRegex(term), "i");
  return [
    { name: rx },
    { slug: rx },
    { articleNo: rx },
    { shortDescription: rx },
    { tags: rx },
    { "compatibleCars.make": rx },
    { "compatibleCars.model": rx },
    { "vehicleCompatibility.vehicles.make": rx },
    { "vehicleCompatibility.vehicles.model": rx },
  ];
}

/**
 * @param {import("mongoose").Model} Product
 * @param {object} baseFilter - status + category/etc (no $text / $or search yet)
 * @param {string} q
 * @param {{ limit: number, skip: number, sortSpec: object, select?: string, populate?: string }} opts
 * @returns {Promise<{ rows: object[], total: number, mode: string }>}
 */
export async function queryProductsWithSearch(Product, baseFilter, q, opts) {
  const term = String(q || "").trim();
  const { limit, skip, sortSpec, select, populate } = opts;

  // Price / name sorts: keep deterministic catalog order after a smart candidate gather.
  const userSortsByField =
    sortSpec &&
    Object.keys(sortSpec).some((k) => k === "pricing.regularPrice" || k === "name");

  if (!term) {
    let query = Product.find(baseFilter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate, "name slug");
    const [rows, total] = await Promise.all([
      query.sort(sortSpec).skip(skip).limit(limit).lean(),
      Product.countDocuments(baseFilter),
    ]);
    return { rows, total, mode: "none" };
  }

  const selectWithSearchFields = select
    ? `${select} tags articleNo compatibleCars.make compatibleCars.model`
    : select;

  const result = await queryProductsSmart(Product, baseFilter, term, {
    limit: userSortsByField ? Math.max(limit + skip, 60) : limit,
    skip: userSortsByField ? 0 : skip,
    select: selectWithSearchFields,
    populate,
    candidateLimit: Math.max(60, (limit + skip) * 4),
    countTotal: true,
    sortSpec: null,
  });

  if (userSortsByField && result.rows.length) {
    const key = Object.keys(sortSpec).find(
      (k) => k === "pricing.regularPrice" || k === "name"
    );
    const dir = sortSpec[key] === -1 || sortSpec[key] === "desc" ? -1 : 1;
    const sorted = [...result.rows].sort((a, b) => {
      let av;
      let bv;
      if (key === "name") {
        av = String(a.name || "");
        bv = String(b.name || "");
        return av.localeCompare(bv) * dir;
      }
      av = Number(a.pricing?.regularPrice) || 0;
      bv = Number(b.pricing?.regularPrice) || 0;
      return (av - bv) * dir;
    });
    return {
      rows: sorted.slice(skip, skip + limit),
      total: result.total,
      mode: result.mode,
    };
  }

  return {
    rows: result.rows,
    total: result.total,
    mode: result.mode,
  };
}
