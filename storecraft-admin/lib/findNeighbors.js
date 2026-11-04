/**
 * Find prev/next documents matching a list's default orderBy.
 * "prev" = toward the start of the list; "next" = toward the end.
 */

function serializeNeighbor(doc, labelField) {
  if (!doc) return null;
  const label =
    (labelField && doc[labelField] != null && String(doc[labelField])) ||
    doc.name ||
    doc.title ||
    doc.code ||
    doc.orderNumber ||
    doc.invoiceNumber ||
    doc.cprNumber ||
    doc.fromPath ||
    "";
  return {
    id: String(doc._id),
    name: String(label || "").trim() || String(doc._id),
  };
}

/**
 * Build a Mongo filter for docs strictly before/after `current` in `orderBy` order.
 * @param {1|-1} listDirection 1 = next in list (follow orderBy), -1 = prev in list
 */
function comparisonFilter(current, sortFields, listDirection) {
  const clauses = [];
  for (let i = 0; i < sortFields.length; i++) {
    const andParts = {};
    for (let j = 0; j < i; j++) {
      const [field] = sortFields[j];
      andParts[field] = current[field];
    }
    const [field, dir] = sortFields[i];
    // Follow list: use sort dir. Reverse list: flip dir.
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
 * @param {string} id
 * @param {{
 *   where?: object,
 *   orderBy?: Record<string, 1|-1>,
 *   labelField?: string,
 *   extraSelect?: string,
 * }} [opts]
 * @returns {Promise<{ prev: {id:string,name:string}|null, next: {id:string,name:string}|null }>}
 */
export async function findNeighborsByOrder(Model, id, opts = {}) {
  const where = opts.where && typeof opts.where === "object" ? opts.where : {};
  const orderBy = opts.orderBy && typeof opts.orderBy === "object" ? opts.orderBy : { createdAt: -1 };
  const labelField = String(opts.labelField || "name");
  const extraSelect = String(opts.extraSelect || "");

  const sortFields = Object.entries(orderBy).filter(([k]) => k);
  if (!sortFields.length) sortFields.push(["createdAt", -1]);
  const lastDir = sortFields[sortFields.length - 1][1] < 0 ? -1 : 1;
  if (!sortFields.some(([k]) => k === "_id")) {
    sortFields.push(["_id", lastDir]);
  }

  const selectSet = new Set(["_id", labelField, ...sortFields.map(([k]) => k)]);
  for (const part of extraSelect.split(/\s+/)) {
    if (part) selectSet.add(part);
  }
  const select = [...selectSet].join(" ");

  const current = await Model.findById(id).select(select).lean();
  if (!current) return { prev: null, next: null };

  const baseAnd = Object.keys(where).length ? [where] : [];
  const nextFilter = { $and: [...baseAnd, comparisonFilter(current, sortFields, 1)] };
  const prevFilter = { $and: [...baseAnd, comparisonFilter(current, sortFields, -1)] };

  const nextSort = Object.fromEntries(sortFields);
  const prevSort = Object.fromEntries(sortFields.map(([k, d]) => [k, d < 0 ? 1 : -1]));

  const [nextDoc, prevDoc] = await Promise.all([
    Model.findOne(nextFilter).sort(nextSort).select(select).lean(),
    Model.findOne(prevFilter).sort(prevSort).select(select).lean(),
  ]);

  return {
    prev: serializeNeighbor(prevDoc, labelField),
    next: serializeNeighbor(nextDoc, labelField),
  };
}
