/**
 * Recover Mongo ObjectId values that were mangled during BSON/JSON clone
 * into `{ buffer: { '0': n, … '11': n } }` or bare `{ '0': n, … }`.
 *
 * Returns a 24-char hex string, or null when the value cannot be coerced.
 */

function bytesToHex(bufLike) {
  if (!bufLike || typeof bufLike !== "object") return null;
  const bytes = [];
  for (let i = 0; i < 12; i++) {
    const n = Number(bufLike[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    bytes.push(n);
  }
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {unknown} value
 * @returns {string|null} 24-char hex ObjectId, or null
 */
export function normalizeMongoObjectId(value) {
  if (value == null || value === "") return null;

  if (typeof value === "string") {
    const s = value.trim();
    return /^[a-f0-9]{24}$/i.test(s) ? s.toLowerCase() : null;
  }

  // Native BSON / mongoose ObjectId
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      try {
        const hex = value.toHexString();
        return /^[a-f0-9]{24}$/i.test(hex) ? hex.toLowerCase() : null;
      } catch {
        /* fall through */
      }
    }
    if (value._bsontype === "ObjectId" && value.id) {
      const hex = bytesToHex(value.id) || bytesToHex(Object.fromEntries(
        [...(value.id || [])].map((b, i) => [String(i), b])
      ));
      if (hex) return hex;
    }

    // { buffer: {0..11} } (clone corruption seen in crazzycars_motorsports)
    if (value.buffer && typeof value.buffer === "object") {
      const hex = bytesToHex(value.buffer);
      if (hex) return hex;
    }

    // Bare {0..11} (populate CastError payload shape)
    if ("0" in value && "11" in value) {
      const hex = bytesToHex(value);
      if (hex) return hex;
    }

    // Populated doc
    if (value._id != null) return normalizeMongoObjectId(value._id);
  }

  return null;
}

/**
 * Normalize a single ref or array of refs to hex id string(s).
 * @param {unknown} value
 * @returns {string|null|string[]}
 */
export function normalizeMongoObjectIdRef(value) {
  if (Array.isArray(value)) {
    return value.map((v) => normalizeMongoObjectId(v)).filter(Boolean);
  }
  return normalizeMongoObjectId(value);
}

/**
 * In-place repair of category parent/ancestor fields for safe populate / queries.
 * @param {object} cat
 * @returns {object}
 */
export function normalizeCategoryParentRefs(cat) {
  if (!cat || typeof cat !== "object") return cat;
  const parent = normalizeMongoObjectId(cat.parentCategory);
  cat.parentCategory = parent;
  if (Array.isArray(cat.parents)) {
    cat.parents = cat.parents.map((p) => normalizeMongoObjectId(p)).filter(Boolean);
  }
  if (Array.isArray(cat.ancestors)) {
    cat.ancestors = cat.ancestors.map((a) => normalizeMongoObjectId(a)).filter(Boolean);
  }
  return cat;
}
