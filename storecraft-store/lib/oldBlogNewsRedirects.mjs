/**
 * Shopify-era /blogs/news/<handle> → closest live 200 page (S2a, 2026-10-29).
 * Single hop only. No 410 rows here — those stay 404 until approved.
 *
 * Remaps vs improve-1028 dry-run:
 *  #4  → /cars/toyota-corolla-e140-2009-2014 (exact generation hub)
 *  #10 → /categories/carbon-fiber (category hub > mirror-only blog)
 *  #17 → /cars/toyota-corolla-e170-2014-2026 (current Corolla shopping hub)
 */

/**
 * Remap notes (not on Next redirect objects — Next rejects unknown fields):
 *  #4  → /cars/toyota-corolla-e140-2009-2014 (exact generation hub)
 *  #10 → /categories/carbon-fiber (category hub > mirror-only blog)
 *  #17 → /cars/toyota-corolla-e170-2014-2026 (current Corolla shopping hub)
 *
 * @type {{ source: string, destination: string, permanent: true }[]}
 */
export const OLD_BLOG_NEWS_REDIRECTS = [
  {
    source: "/blogs/news/best-car-accessories-for-honda-city-in-pakistan-2024",
    destination: "/blogs/toyota-yaris-vs-honda-city-best-accessories",
    permanent: true,
  },
  {
    source: "/blogs/news/best-car-accessories-for-toyota-corolla-e140-2009-2013-in-pakistan",
    destination: "/cars/toyota-corolla-e140-2009-2014",
    permanent: true,
  },
  {
    source: "/blogs/news/best-honda-city-accessories-in-pakistan-complete-upgrade-guide",
    destination: "/blogs/toyota-yaris-vs-honda-city-best-accessories",
    permanent: true,
  },
  {
    source: "/blogs/news/body-kit-price-pakistan-2026-honda-civic-toyota-corolla",
    destination: "/blogs/body-kit-price-in-pakistan-2026",
    permanent: true,
  },
  {
    source: "/blogs/news/carbon-fiber-car-accessories-in-pakistan-complete-buyers-guide",
    destination: "/categories/carbon-fiber",
    permanent: true,
  },
  {
    source: "/blogs/news/funny-led-gesture-light-viral-pakistan-2026",
    destination: "/blogs/led-ambient-lighting-car-buyer-guide",
    permanent: true,
  },
  {
    source: "/blogs/news/honda-civic-accessories-price-pakistan-2024",
    destination: "/blogs/honda-civic-accessories-guide-every-generation",
    permanent: true,
  },
  {
    source: "/blogs/news/honda-civic-reborn-vs-rebirth-which-accessories-fit-which-model",
    destination: "/blogs/honda-civic-accessories-guide-every-generation",
    permanent: true,
  },
  {
    source: "/blogs/news/how-to-install-batman-style-side-mirror-covers-step-by-step-guide",
    destination: "/blogs/batman-style-side-mirror-covers-pakistan-fitment-guide",
    permanent: true,
  },
  {
    source: "/blogs/news/top-10-car-accessories-for-toyota-corolla-in-pakistan-2024",
    destination: "/cars/toyota-corolla-e170-2014-2026",
    permanent: true,
  },
  // S2b remaps (finish-1029) — destinations verified 200 on live
  {
    source: "/blogs/news/best-car-accessories-for-hyundai-elantra-in-pakistan-2024",
    destination: "/cars/hyundai-elantra-2020-2024",
    permanent: true,
  },
  {
    source: "/blogs/news/best-car-accessories-for-suzuki-swift-2025-in-pakistan",
    destination: "/cars/suzuki-swift-2025-present",
    permanent: true,
  },
  {
    source: "/blogs/news/best-car-accessories-online-pakistan-2026-complete-guide",
    destination: "/shop",
    permanent: true,
  },
  {
    source: "/blogs/news/best-suzuki-alto-accessories-in-pakistan-complete-upgrade-guide",
    destination: "/cars/suzuki-alto-2020-present",
    permanent: true,
  },
  {
    source: "/blogs/news/brembo-caliper-covers-pakistan-review-2026",
    destination: "/car-brembo-style-brake-caliper-covers-universal-fit",
    permanent: true,
  },
  {
    source: "/blogs/news/multimedia-steering-wheel-buttons-price-pakistan-2026",
    destination: "/honda-civic-reborn-2006-2012-multimedia-steering-wheel-audio-control-buttons",
    permanent: true,
  },
  {
    source: "/blogs/news/toyota-corolla-steering-monogram-trending-pakistan-2026",
    destination: "/toyota-corolla-2009-2026-carbon-steering-monogram-abs",
    permanent: true,
  },
];

const PATH_MAP = new Map(
  OLD_BLOG_NEWS_REDIRECTS.map((r) => [
    r.source.replace(/\/+$/, "").toLowerCase(),
    r.destination,
  ])
);

/**
 * @param {string} pathname
 * @returns {string|null}
 */
export function resolveOldBlogNewsPath(pathname) {
  const path =
    String(pathname || "")
      .trim()
      .replace(/\/+$/, "")
      .toLowerCase() || "/";
  return PATH_MAP.get(path) || null;
}
