/**
 * SEO precedence (Task 11): admin/DB (non-empty) > code override > generated fallback.
 * @param {{ db?: string|null, override?: string|null, fallback?: string|null }} opts
 * @returns {string}
 */
export function resolveSeo({ db, override, fallback } = {}) {
  const pick = (v) => {
    const s = String(v ?? "").trim();
    return s || "";
  };
  return pick(db) || pick(override) || pick(fallback) || "";
}

/** Strip banned claim words from generated meta (not from product names). */
export function stripClaimWordsFromMeta(text) {
  return String(text || "")
    .replace(/\b(best|#1|oem|genuine|original|perfect|premium|100%)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}
