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
    destination: "/blogs/side-mirror-covers-carbon-fiber-accents-guide",
    permanent: true,
  },
  {
    source: "/blogs/news/top-10-car-accessories-for-toyota-corolla-in-pakistan-2024",
    destination: "/cars/toyota-corolla-e170-2014-2026",
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
