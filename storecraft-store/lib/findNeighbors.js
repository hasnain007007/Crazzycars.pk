/**
 * Storefront neighbors — same compound-sort logic as admin, plus href.
 */

function serializeNeighbor(doc, labelField, hrefForDoc) {
  if (!doc) return null;
  const label =
    (labelField && doc[labelField] != null && String(doc[labelField])) ||
    doc.name ||
    doc.title ||
    doc.displayName ||
    "";
  const href = typeof hrefForDoc === "function" ? hrefForDoc(doc) : "";
  if (!href) return null;
  return {
    id: String(doc._id || doc.id || ""),
    name: String(label || "").trim() || "Item",
    href,
  };
}

function comparisonFilter(current, sortFields, listDirection) {
  const clauses = [];
  for (let i = 0; i < sortFields.length; i++) {
    const andParts = {};
    for (let j = 0; j < i; j++) {
      const [field] = sortFields[j];
      andParts[field] = current[field];
    }
    const [field, dir] = sortFields[i];
    const effective = dir * listDirection;
    const op = effective < 0 ? "$lt" : "$gt";
    const value = current[field];
    if (value === undefined || value === null) continue;
    andParts[field] = { [op]: value };
    clauses.push(andParts);
  }
  if (!clauses.length) return { _id: { $ne: current._id } };
  return { $or: clauses };
}

/**
 * @param {import("mongoose").Model} Model
 * @param {object} current lean doc with _id + sort fields
 * @param {{
 *   where?: object,
 *   orderBy?: Record<string, 1|-1>,
 *   labelField?: string,
 *   hrefForDoc: (doc: object) => string,
 *   extraSelect?: string,
 * }} opts
 */
export async function findNeighborsByOrder(Model, current, opts = {}) {
  if (!current?._id) return { prev: null, next: null };
  const where = opts.where && typeof opts.where === "object" ? opts.where : {};
  const orderBy = opts.orderBy && typeof opts.orderBy === "object" ? opts.orderBy : { createdAt: -1 };
  const labelField = String(opts.labelField || "name");
  const hrefForDoc = opts.hrefForDoc;

  const sortFields = Object.entries(orderBy).filter(([k]) => k);
  if (!sortFields.length) sortFields.push(["createdAt", -1]);
  const lastDir = sortFields[sortFields.length - 1][1] < 0 ? -1 : 1;
  if (!sortFields.some(([k]) => k === "_id")) {
    sortFields.push(["_id", lastDir]);
  }

  // RSC JSON may stringify Dates — coerce so Mongo comparisons work.
  const cursor = { ...current };
  for (const [field] of sortFields) {
    const v = cursor[field];
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) cursor[field] = d;
    }
  }
  if (cursor._id && typeof cursor._id === "string") {
    // keep string; mongoose casts in queries
  }

  const selectSet = new Set(["_id", labelField, "slug", ...sortFields.map(([k]) => k)]);
  for (const part of String(opts.extraSelect || "").split(/\s+/)) {
    if (part) selectSet.add(part);
  }
  const select = [...selectSet].join(" ");

  const baseAnd = Object.keys(where).length ? [where] : [];
  const nextFilter = { $and: [...baseAnd, comparisonFilter(cursor, sortFields, 1)] };
  const prevFilter = { $and: [...baseAnd, comparisonFilter(cursor, sortFields, -1)] };
  const nextSort = Object.fromEntries(sortFields);
  const prevSort = Object.fromEntries(sortFields.map(([k, d]) => [k, d < 0 ? 1 : -1]));

  const [nextDoc, prevDoc] = await Promise.all([
    Model.findOne(nextFilter).sort(nextSort).select(select).lean(),
    Model.findOne(prevFilter).sort(prevSort).select(select).lean(),
  ]);

  return {
    prev: serializeNeighbor(prevDoc, labelField, hrefForDoc),
    next: serializeNeighbor(nextDoc, labelField, hrefForDoc),
  };
}

/**
 * Neighbors from a fixed ordered list of items (e.g. city landing slugs).
 * @param {Array<{ id?: string, slug?: string, name?: string, href: string }>} items
 * @param {(item: object) => boolean} isCurrent
 */
export function neighborsFromList(items, isCurrent) {
  const list = Array.isArray(items) ? items : [];
  const idx = list.findIndex(isCurrent);
  if (idx < 0) return { prev: null, next: null };
  const toNeighbor = (item) =>
    item
      ? {
          id: String(item.id || item.slug || ""),
          name: String(item.name || item.title || "").trim() || "Item",
          href: item.href,
        }
      : null;
  return {
    prev: toNeighbor(list[idx - 1] || null),
    next: toNeighbor(list[idx + 1] || null),
  };
}
