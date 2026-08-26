const DEFAULT_BRAND =
  process.env.NEXT_PUBLIC_STORE_NAME ||
  process.env.NEXT_PUBLIC_APP_NAME ||
  "Homefy.pk";

/** Strip a trailing `| Homefy(.pk)` / dash-brand suffix (any casing). */
export function stripTrailingBrand(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s*[|\u2013\u2014–—-]\s*Crazzy\s*Cars(?:\.pk)?\s*$/i, "")
    .replace(/\s*[|\u2013\u2014–—-]\s*$/g, "")
    .trim();
}

/**
 * Build a Next.js metadata title that opts out of the root layout
 * `template: '%s | {storeName}'` so brand is never appended twice.
 *
 * Never mid-word truncates. If `base | brand` exceeds `max`, returns base only
 * (even if base alone is still over max — names are not shortened here).
 */
export function buildBrandedAbsoluteTitle(
  raw,
  { max = 60, brand = DEFAULT_BRAND } = {}
) {
  const brandStr = String(brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
  const base = stripTrailingBrand(raw);

  if (!base) {
    return { absolute: brandStr };
  }

  const withBrand = `${base} | ${brandStr}`;
  if (withBrand.length <= max) {
    return { absolute: withBrand };
  }

  return { absolute: base };
}
