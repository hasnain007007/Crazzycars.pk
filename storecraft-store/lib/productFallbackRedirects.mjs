/**
 * /products/:handle (and flat /:handle) → closest live canonical when the
 * stripped slug has no active product. Keep free of `@/` imports.
 *
 * Live probe of Pages.csv /products/* URLs (10 Oct 2026): 183 resolve via
 * existing strip/fuzzy match; 5 land on 404. Those five are listed here and
 * in SEO_REDIRECT_REVIEW.md (brief estimated ~28; catalogue resolution improved).
 */

import { stripBrandSuffix } from "./productSlugParam.js";

/** @type {Record<string, string>} handle (with or without -crazzycars-pk) → path */
export const PRODUCT_FALLBACK_REDIRECTS = {
  "honda-civic-reborn-2006-2011-body-kit-d1": "/honda-civic-reborn-2006-2011-body-kit-d3",
  "honda-civic-reborn-2006-2011-body-kit-d1-crazzycars-pk":
    "/honda-civic-reborn-2006-2011-body-kit-d3",
  "honda-civic-reborn-2006-2011-body-kit-d4": "/honda-civic-reborn-2006-2011-body-kit-d3",
  "honda-civic-reborn-2006-2011-body-kit-d4-crazzycars-pk":
    "/honda-civic-reborn-2006-2011-body-kit-d3",
  "toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair":
    "/toyota-corolla-2014-2026-side-mirror-neon-style-indicator",
  "toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair-crazzycars-pk":
    "/toyota-corolla-2014-2026-side-mirror-neon-style-indicator",
  "suzuki-swift-2018-2024-complete-body-kit-fibreglass":
    "/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass",
  "suzuki-swift-2018-2024-complete-body-kit-fibreglass-crazzycars-pk":
    "/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass",
  "canbus-bright-led-indicator-bulbs-2-pcs": "/bright-led-indicator-bulbs-2-pcs",
  "canbus-bright-led-indicator-bulbs-2-pcs-crazzycars-pk": "/bright-led-indicator-bulbs-2-pcs",
};

/**
 * Resolve a product handle to a one-hop destination path.
 * Prefer explicit fallback, else strip brand suffix to /:slug.
 * @returns {string|null} path starting with /
 */
export function resolveProductRedirectPath(rawHandle) {
  const handle = String(rawHandle || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (!handle || handle.includes("/")) return null;

  if (PRODUCT_FALLBACK_REDIRECTS[handle]) {
    return PRODUCT_FALLBACK_REDIRECTS[handle];
  }

  const stripped = stripBrandSuffix(handle) || handle;
  if (PRODUCT_FALLBACK_REDIRECTS[stripped]) {
    return PRODUCT_FALLBACK_REDIRECTS[stripped];
  }

  return `/${stripped}`;
}

/** Flat slug paths that should 308 even when requested without /products/. */
export function resolveFlatProductFallback(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (!slug || slug.includes("/")) return null;
  return (
    PRODUCT_FALLBACK_REDIRECTS[slug] ||
    PRODUCT_FALLBACK_REDIRECTS[`${slug}-crazzycars-pk`] ||
    null
  );
}
