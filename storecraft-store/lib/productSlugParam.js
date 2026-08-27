const BRAND_SUFFIX_RE = /-crazzycars-pk$/i;

/** Strip Meta/Shopify leftover `-crazzycars-pk` so middleware can 308 in one hop. */
export function stripBrandSuffix(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return "";
  const stripped = slug.replace(BRAND_SUFFIX_RE, "");
  return stripped || slug;
}

/**
 * Incoming URL slugs to try, in order.
 * Meta / Shopify / seed handles often keep `-crazzycars-pk` after Mongo dropped it
 * (or the reverse). Exact current slug is always first.
 */
export function productSlugCandidates(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return [];
  const keys = [slug];
  if (BRAND_SUFFIX_RE.test(slug)) {
    const stripped = slug.replace(BRAND_SUFFIX_RE, "");
    if (stripped) keys.push(stripped);
  } else {
    keys.push(`${slug}-crazzycars-pk`);
  }
  return [...new Set(keys)];
}
