/**
 * Normalizes SEO meta keywords from API payloads or legacy DB shapes into a string array.
 */
export function normalizeMetaKeywords(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((k) => String(k).trim()).filter(Boolean))];
  }
  if (typeof input === "string" && input.trim()) {
    return [...new Set(input.split(",").map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}

/**
 * Ensures API JSON always returns `seo.metaKeywords` as a string array (legacy string in DB supported).
 */
export function withNormalizedSeoDoc(doc) {
  if (!doc?.seo) return doc;
  return {
    ...doc,
    seo: {
      ...doc.seo,
      metaKeywords: normalizeMetaKeywords(doc.seo.metaKeywords),
    },
  };
}
