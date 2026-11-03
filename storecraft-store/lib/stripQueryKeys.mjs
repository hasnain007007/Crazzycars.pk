/**
 * Query keys stripped on redirect (Shopify / tracking leftovers).
 * Intentionally does NOT include `page` — pagination stays self-canonical.
 */
export const STRIP_QUERY_KEYS = new Set([
  "variant",
  "country",
  "currency",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "srsltid",
  "ref",
  "mc_cid",
  "mc_eid",
  "_pos",
  "_fid",
  "_ss",
  "_v",
  "pb",
]);

/** True when a query key should be stripped (incl. jdgm_* / utm_* prefixes). */
export function shouldStripQueryKey(key) {
  const lower = String(key || "").toLowerCase();
  if (!lower) return false;
  if (STRIP_QUERY_KEYS.has(lower)) return true;
  if (lower.startsWith("utm_")) return true;
  if (lower.startsWith("jdgm_")) return true;
  return false;
}
