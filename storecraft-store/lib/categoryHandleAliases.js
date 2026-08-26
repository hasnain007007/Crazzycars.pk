/**
 * Shopify-era / shortened category handles → canonical Mongo slugs.
 * Implementation lives in legacyHandleMaps.mjs so next.config.mjs can import it.
 */
export {
  CATEGORY_HANDLE_ALIASES,
  MAKE_HANDLE_ALIASES,
  PAGE_HANDLE_ALIASES,
  VEHICLE_HANDLE_ALIASES,
  aliasedCategorySlug,
  buildLegacyRedirects,
  normalizeCategoryHandle,
  resolveLegacyDestination,
  rewriteStorePath,
} from "./legacyHandleMaps.mjs";
