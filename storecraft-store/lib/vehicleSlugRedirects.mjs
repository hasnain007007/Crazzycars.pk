/**
 * Explicit /cars/* slug variant → live hub redirects (SEO fix 2026-11-10 T10a).
 * Do not infer hyphenation rules — every pair was verified 200 on the target.
 * Unmatched unknown /cars/* must 404 (not catch-all to /categories/exterior).
 */

/** @type {{ source: string, destination: string, permanent: true }[]} */
export const VEHICLE_SLUG_REDIRECTS = [
  {
    source: "/cars/changan-oshan-x7-2022-present",
    destination: "/cars/changan-oshanx7-2022-present",
    permanent: true,
  },
  {
    source: "/cars/byd-atto-3-2025-present",
    destination: "/cars/byd-atto3-2025-present",
    permanent: true,
  },
  {
    source: "/cars/toyota-prado-j150-2009-2023",
    destination: "/cars/toyota-prado-2009-2023",
    permanent: true,
  },
  {
    source: "/cars/suzuki-wagon-r-2014-present",
    destination: "/cars/suzuki-wagonr-2014-present",
    permanent: true,
  },
  {
    source: "/cars/honda-br-v-2017-present",
    destination: "/cars/honda-brv-2017-present",
    permanent: true,
  },
  {
    source: "/cars/chery-tiggo-8-pro-2022-present",
    destination: "/cars/chery-tiggo8pro-2022-present",
    permanent: true,
  },
  {
    source: "/cars/toyota-prius-xw30-2009-2015",
    destination: "/cars/toyota-prius-2009-2015",
    permanent: true,
  },
  {
    source: "/cars/toyota-prius-xw20-2004-2009",
    destination: "/cars/toyota-prius-2004-2009",
    permanent: true,
  },
  {
    source: "/cars/sonata-2020-2024-dn8",
    destination: "/cars/hyundai-sonata-2020-2024",
    permanent: true,
  },
  {
    source: "/cars/elantra-2020-2024-cn7",
    destination: "/cars/hyundai-elantra-2020-2024",
    permanent: true,
  },
  {
    source: "/cars/hyundai-elantra-hybrid-2025-present-cn7-facelift",
    destination: "/cars/hyundai-elantra-hybrid-2025-present",
    permanent: true,
  },
  {
    source: "/cars/hyundai-elantra-2020-2024-2020-elantra-2020-2024-cn7",
    destination: "/cars/hyundai-elantra-2020-2024",
    permanent: true,
  },
  {
    source: "/cars/hyundai-sonata-2020-sonata-2020-2024-dn8",
    destination: "/cars/hyundai-sonata-2020-2024",
    permanent: true,
  },
  // tucson-hybrid-2025-nx4 → OWNER DECISION (Q-T10a-tucson); no redirect until answered
];

/**
 * Empty / non-existent hubs that must 404 (not redirect to /cars or exterior).
 * Remove any prior catch-all redirects for these.
 */
export const VEHICLE_SLUGS_MUST_404 = [
  "/cars/audi-a5-2008-present",
  "/cars/audi-a5-2014",
  "/cars/honda-hrv-2022-present",
  "/cars/honda-hr-v-2022-present",
  "/cars/byd-shark6-2025-present",
];

/** @param {string} pathname */
export function resolveVehicleSlugRedirect(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  const hit = VEHICLE_SLUG_REDIRECTS.find((r) => r.source === p);
  return hit ? hit.destination : null;
}
