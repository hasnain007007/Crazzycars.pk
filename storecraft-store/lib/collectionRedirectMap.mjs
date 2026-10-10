/**
 * Shopify-era /collections/:handle → canonical storefront path.
 * One map for middleware tests, next.config legacy redirects, and
 * resolveCollectionHandleToPath. Keep free of `@/` imports.
 *
 * Targets verified against live category/car slugs (Search Console Pages.csv, 10 Oct 2026).
 * Uncertain rows are listed in SEO_REDIRECT_REVIEW.md.
 */

/** @type {Record<string, string>} handle → absolute path starting with / */
export const COLLECTIONS_REDIRECT_MAP = {
  // Brief-known mappings
  "interior-light": "/categories/interior-lights",
  "car-steering-wheel-covers": "/categories/steering-wheel-covers",
  "led-indicator-lights": "/categories/led-indicator-lights",
  "car-splitters-side-skirts": "/categories/splitters-side-skirts",
  "carbon-fiber-side-mirror-covers": "/categories/side-mirror-covers",
  "car-quarter-window-louvers": "/categories/quarter-window-louvers",
  "toyota-yaris-accessories-shop-online-crazzycars-pk": "/cars/toyota-yaris-2020-present",
  "toyota-aqua-accessories-shop-online-crazzycars-pk": "/cars/toyota-aqua-2012-present",
  "toyota-corolla-2009-2014-accessories": "/cars/toyota-corolla-e140-2009-2014",
  "honda-civic-reborn-2006-2012-accessories": "/cars/honda-civic-reborn-2006-2012",
  "suzuki-swift-2025-present-accessories": "/cars/suzuki-swift-2025-present",
  // Ambiguous (City 2009–2020 vs 2021–present) — proposed newest gen; see SEO_REDIRECT_REVIEW.md
  "honda-city": "/cars/honda-city-2021-present",

  // System / merchandising
  all: "/shop",
  frontpage: "/shop",
  "best-car-accessories-deals": "/sale",

  // Pages.csv collections resolved by slug similarity (verified 200 on live)
  "air-freshner-and-decoration": "/categories/air-freshener-decoration",
  "body-kits-extensions": "/categories/body-kits-extensions",
  "car-emergency-safety-products": "/categories/car-care-safety",
  "car-exhaust-systems-tips": "/categories/exhaust-systems-tips",
  "car-spoilers-diffusers": "/categories/spoilers-diffusers",
  "carbon-fiber-car-accessories-shop-online-crazzycars-pk": "/categories/carbon-fiber",
  "haval-h6-accessories-crazzycars-pk": "/cars/haval-h6-2021-present",
  "honda-accessories-shop-by-model-crazzycars-pk": "/cars",
  "honda-city-2016-accessories-body-kits": "/cars/honda-city-classic-2009-2020",
  "honda-civic-11th-gen-2022-present-accessories": "/cars/honda-civic-11th-gen-2022-present",
  "honda-civic-accessories": "/cars",
  "honda-civic-rebirth-2012-2016-accessories-body-kits": "/cars/honda-civic-rebirth-2012-2016",
  "honda-civic-x-2016-2021-accessories-body-kits": "/cars/honda-civic-x-2016-2021",
  "hyundai-elantra-2020-2024-accessories": "/cars/hyundai-elantra-2020-2024",
  "hyundai-elantra-hybrid-2025-present-accessories": "/cars/hyundai-elantra-hybrid-2025-present",
  "hyundai-sonata-2020-2024-accessories": "/cars/hyundai-sonata-2020-2024",
  "led-headlights-bulbs": "/categories/led-headlights-bulbs",
  "multimedia-steering-controls": "/categories/multimedia-steering-controls",
  "sos-flasher-led-lights": "/categories/sos-flasher-led-lights",
  "suzuki-accessories-shop-by-model-crazzycars-pk": "/cars",
  "suzuki-alto-2020-accessories": "/cars/suzuki-alto-2020-present",
  "toyota-car-accessories": "/cars",
  "toyota-corolla-e170-2014-2020-accessories": "/cars/toyota-corolla-e170-2014-2026",
  "toyota-vitz-accessories-shop-online-crazzycars-pk": "/cars/toyota-vitz-2012-present",
  "universal-car-accessories": "/categories/universal-accessories",
};

/** Handles whose target needs owner approval (still mapped above for crawl repair). */
export const COLLECTIONS_REDIRECT_REVIEW = [
  {
    from: "/collections/honda-city",
    proposed: "/cars/honda-city-2021-present",
    reason: "Ambiguous between honda-city-classic-2009-2020 and honda-city-2021-present",
  },
  {
    from: "/collections/car-emergency-safety-products",
    proposed: "/categories/car-care-safety",
    reason: "Closest live category by slug/theme; no exact emergency-safety leaf",
  },
];

export function normalizeCollectionHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

/** Sync lookup — absolute path or null. */
export function resolveCollectionRedirect(rawHandle) {
  const handle = normalizeCollectionHandle(rawHandle);
  if (!handle) return null;
  return COLLECTIONS_REDIRECT_MAP[handle] || null;
}
