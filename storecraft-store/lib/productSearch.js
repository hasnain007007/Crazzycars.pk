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

  const selectWithSearchFields = (() => {
    if (!select) return select;
    const parts = String(select).split(/\s+/).filter(Boolean);
    const hasCompatibleCars = parts.some(
      (p) => p === "compatibleCars" || p.startsWith("compatibleCars.")
    );
    const hasVehicleCompat = parts.some(
      (p) => p === "vehicleCompatibility" || p.startsWith("vehicleCompatibility.")
    );
    const extra = [];
    if (!parts.includes("tags")) extra.push("tags");
    if (!parts.includes("articleNo")) extra.push("articleNo");
    if (!parts.includes("shortDescription")) extra.push("shortDescription");
    // Avoid Mongo path collision: don't add compatibleCars.make when compatibleCars is already selected.
    if (!hasCompatibleCars) {
      extra.push("compatibleCars.make", "compatibleCars.model");
    }
    if (!hasVehicleCompat) {
      extra.push("vehicleCompatibility.vehicles.make", "vehicleCompatibility.vehicles.model");
    }
    return [...parts, ...extra].join(" ");
  })();

  try {
    const result = await queryProductsSmart(Product, baseFilter, term, {
      limit: userSortsByField ? Math.max(limit + skip, 80) : limit,
      skip: userSortsByField ? 0 : skip,
      select: selectWithSearchFields,
      populate,
      candidateLimit: Math.max(100, (limit + skip) * 5),
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
  } catch (err) {
    console.error("queryProductsWithSearch failed, regex fallback:", err?.message || err);
    const rx = new RegExp(escapeRegex(term), "i");
    const or = buildProductRegexOr(term) || [{ name: rx }];
    let query = Product.find({ ...baseFilter, $or: or });
    if (selectWithSearchFields) query = query.select(selectWithSearchFields);
    if (populate) query = query.populate(populate, "name slug");
    const [rows, total] = await Promise.all([
      query.sort(sortSpec || { createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments({ ...baseFilter, $or: or }),
    ]);
    return { rows, total, mode: "regex-fallback" };
  }
}
