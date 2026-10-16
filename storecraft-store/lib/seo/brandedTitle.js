import {
  BRAND_NAME,
  stripTrailingBrandSuffix,
  withBrandTitleSuffix,
} from "../brand.js";

/** Strip a trailing `| CrazzyCars(.pk)` / dash-brand suffix (any casing). */
export function stripTrailingBrand(raw) {
  return stripTrailingBrandSuffix(raw);
}

/**
 * Build a Next.js metadata title that opts out of the root layout
 * `template: '%s | {storeName}'` so brand is never appended twice.
 *
 * Admin titles with a trailing brand variant are normalised; suffix is dropped
 * when `base | CrazzyCars.pk` would exceed `max`.
 */
export function buildBrandedAbsoluteTitle(
  raw,
  { max = 60, brand = BRAND_NAME } = {}
) {
  const brandStr = String(brand || BRAND_NAME).trim() || BRAND_NAME;
  const absolute = withBrandTitleSuffix(raw, { maxLen: max });
  // If caller passed a non-canonical brand, rebuild with that brand once.
  if (brandStr !== BRAND_NAME) {
    const base = stripTrailingBrandSuffix(raw);
    if (!base) return { absolute: brandStr };
    const withBrand = `${base} | ${brandStr}`;
    return { absolute: withBrand.length <= max ? withBrand : base };
  }
  return { absolute };
}
