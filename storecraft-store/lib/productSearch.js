/**
 * Product catalog search: prefer MongoDB $text (product_text_search index),
 * fall back to multi-field regex when text search errors or returns nothing.
 * SKU-like queries (e.g. CC-0001) use articleNo prefix match first — $text
 * tokenizes on hyphens and over-matches.
 */
function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikeSku(term) {
  const t = String(term || "").trim();
  return /^[a-z]{1,8}[-_][a-z0-9][-a-z0-9_]*$/i.test(t) || /^cc[-_]?\d+/i.test(t);
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
 * @returns {Promise<{ rows: object[], total: number, mode: "sku"|"text"|"regex"|"none" }>}
 */
export async function queryProductsWithSearch(Product, baseFilter, q, opts) {
  const term = String(q || "").trim();
  const { limit, skip, sortSpec, select, populate } = opts;

  async function runFind(filter, sort) {
    let query = Product.find(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate, "name slug");
    const [rows, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return { rows, total };
  }

  if (!term) {
    const { rows, total } = await runFind(baseFilter, sortSpec);
    return { rows, total, mode: "none" };
  }

  // Article / SKU codes: exact-ish articleNo match beats hyphen-tokenized $text.
  if (looksLikeSku(term)) {
    const skuFilter = {
      ...baseFilter,
      articleNo: new RegExp(`^${escapeRegex(term)}`, "i"),
    };
    const sku = await runFind(skuFilter, sortSpec);
    if (sku.rows.length || sku.total > 0) {
      return { ...sku, mode: "sku" };
    }
  }

  // Prefer $text for relevance + index speed.
  try {
    const textFilter = { ...baseFilter, $text: { $search: term } };
    const textSort =
      sortSpec && Object.keys(sortSpec).some((k) => k === "pricing.regularPrice" || k === "name")
        ? sortSpec
        : { score: { $meta: "textScore" }, ...sortSpec };

    let query = Product.find(textFilter, { score: { $meta: "textScore" } });
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate, "name slug");

    const [rows, total] = await Promise.all([
      query.sort(textSort).skip(skip).limit(limit).maxTimeMS(4000).lean(),
      Product.countDocuments(textFilter).maxTimeMS(4000),
    ]);

    if (rows.length || total > 0) {
      return { rows, total, mode: "text" };
    }
  } catch {
    // No text index / query error — fall through to regex.
  }

  const regexOr = buildProductRegexOr(term);
  const regexFilter = {
    ...baseFilter,
    ...(regexOr ? { $or: regexOr } : {}),
  };
  const regex = await runFind(regexFilter, sortSpec);
  return { ...regex, mode: "regex" };
}
