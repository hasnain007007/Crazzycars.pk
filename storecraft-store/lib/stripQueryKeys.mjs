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
  "mc_cid",
  "mc_eid",
  "_pos",
  "_fid",
  "_ss",
  "_v",
  "pb",
]);
