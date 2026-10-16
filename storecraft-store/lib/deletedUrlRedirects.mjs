/**
 * Explicit permanent redirects for deleted catalogue / car URLs (SEO audit 16 Oct 2026).
 * Keep free of `@/` imports — used from next.config.mjs and middleware.
 *
 * Every destination was verified 200 on crazzycars.pk before merge.
 */

/** @type {{ source: string, destination: string, permanent: true }[]} */
export const DELETED_URL_REDIRECTS = [
  { source: "/bmw-style-rgb-ac-vents-suzuki-swift-alto", destination: "/cars/suzuki-swift-2018-2024", permanent: true },
  { source: "/changan-alsvin-2021-present-rear-bumper-led-lights", destination: "/cars/changan-alsvin-2021-present", permanent: true },
  { source: "/gold-leopard-dashboard-ornament-sculpture", destination: "/categories/air-freshener-decoration", permanent: true },
  { source: "/gold-lion-dashboard-ornament-sculpture", destination: "/categories/air-freshener-decoration", permanent: true },
  { source: "/haval-h6-rubber-infotainment-screen-protector", destination: "/cars/haval-h6-2021-present", permanent: true },
  { source: "/hks-style-chameleon-exhaust-muffler-tip-universal", destination: "/categories/exhaust-systems-tips", permanent: true },
  { source: "/honda-city-2015-2023-r-type-ducktail-trunk-spoiler", destination: "/cars/honda-city-classic-2009-2020", permanent: true },
  { source: "/honda-city-2021-2026-carbon-fiber-ac-vent-trims-3pcs", destination: "/cars/honda-city-2021-present", permanent: true },
  { source: "/honda-city-2021-2026-carbon-steering-multimedia-button-trims", destination: "/cars/honda-city-2021-present", permanent: true },
  { source: "/honda-city-2021-present-rear-bumper-led-lights", destination: "/cars/honda-city-2021-present", permanent: true },
  { source: "/honda-city-classic-2009-2020-rear-bumper-led-lights", destination: "/cars/honda-city-classic-2009-2020", permanent: true },
  { source: "/honda-civic-2022-ac-vent-carbon-fiber-trim-2pcs", destination: "/cars/honda-civic-11th-gen-2022-present", permanent: true },
  { source: "/honda-civic-rebirth-2012-2015-carbon-fiber-steering-trim", destination: "/cars/honda-civic-rebirth-2012-2016", permanent: true },
  { source: "/honda-civic-rebirth-2012-2016-side-mirror-led-indicators", destination: "/cars/honda-civic-rebirth-2012-2016", permanent: true },
  { source: "/honda-civic-reborn-2006-2012-gear-box-carbon-fiber-trim", destination: "/cars/honda-civic-reborn-2006-2012", permanent: true },
  { source: "/honda-civic-x-2016-2021-ac-vent-frame-carbon-fiber-trims", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-complete-interior-carbon-fiber-trim-kit", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-fender-led-marker-indicators", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-front-reading-light-carbon-fiber-trim", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-jdm-ducktail-trunk-spoiler", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-rear-diffuser-black-red-quad-tip", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-rear-window-back-screen-louver", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-type-r-front-bumper-mesh-inserts", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/honda-civic-x-2016-2021-type-r-rear-bumper-reflector-led", destination: "/cars/honda-civic-x-2016-2021", permanent: true },
  { source: "/hyundai-carbon-fiber-steering-wheel-monogram", destination: "/categories/stickers-monograms-emblems", permanent: true },
  { source: "/hyundai-elantra-2020-2024-rear-window-roof-spoiler", destination: "/cars/hyundai-elantra-2020-2024", permanent: true },
  { source: "/hyundai-elantra-2020-2024-trunk-lip-spoiler", destination: "/cars/hyundai-elantra-2020-2024", permanent: true },
  { source: "/jasma-style-dual-burnt-stainless-exhaust-muffler-tip", destination: "/categories/exhaust-systems-tips", permanent: true },
  { source: "/suzuki-alto-2019-2026-lava-rear-bumper-lights", destination: "/cars/suzuki-alto-2020-present", permanent: true },
  { source: "/suzuki-alto-2019-2026-txr-iconic-air-press-door-visors", destination: "/cars/suzuki-alto-2020-present", permanent: true },
  { source: "/suzuki-alto-carbon-fiber-door-handle-covers-4pcs", destination: "/cars/suzuki-alto-2020-present", permanent: true },
  { source: "/suzuki-fronx-rear-bumper-led-lights", destination: "/categories/rear-reflectors", permanent: true },
  { source: "/suzuki-wagonr-cultus-alto-smoke-fender-running-indicators", destination: "/categories/fender-light", permanent: true },
  { source: "/toyota-corolla-2014-2026-rear-bumper-led-lights", destination: "/cars/toyota-corolla-e170-2014-2026", permanent: true },
  { source: "/toyota-corolla-2014-2026-side-mirror-led-indicators", destination: "/cars/toyota-corolla-e170-2014-2026", permanent: true },
  { source: "/toyota-corolla-e140-2009-2014-rear-bumper-led-lights", destination: "/cars/toyota-corolla-e140-2009-2014", permanent: true },
  { source: "/toyota-fortuner-led-tail-lights-pair", destination: "/cars/toyota-fortuner-2020-present", permanent: true },
  { source: "/toyota-mark-x-side-mirror-led-indicators", destination: "/cars/toyota-mark-x-2009-2022", permanent: true },
  { source: "/toyota-prius-30-side-mirror-led-indicators", destination: "/cars/toyota-prius-2009-2015", permanent: true },
  { source: "/trd-style-seat-belt-buckle-clips-pair", destination: "/categories/universal-accessories", permanent: true },
  { source: "/universal-carbon-fiber-style-door-handle-covers", destination: "/categories/door-handle-covers", permanent: true },
  { source: "/universal-galaxy-starry-sky-sunroof-headliner-film", destination: "/categories/interior-lights", permanent: true },
  { source: "/universal-led-rear-lip-spoiler-kit", destination: "/categories/spoilers-diffusers", permanent: true },
  { source: "/universal-lime-green-fog-light-led-h11-pair", destination: "/categories/led-headlights-bulbs", permanent: true },
  { source: "/universal-rgb-headlight-drl-strip-kit", destination: "/categories/led-headlights-bulbs", permanent: true },
  {
    source: "/universal-suzuki-automatic-gear-shift-knob-7-colour-rgb-crystal",
    destination: "/categories/universal-accessories",
    permanent: true,
  },
  // No Fronx car page in the live catalogue — closest Suzuki generation page.
  { source: "/cars/suzuki-fronx-2025-present", destination: "/cars/suzuki-swift-2025-present", permanent: true },
];

/** Flat slug → destination path (no leading slash on key). */
const FLAT_MAP = new Map(
  DELETED_URL_REDIRECTS.filter((r) => !r.source.startsWith("/cars/") && !r.source.startsWith("/categories/")).map(
    (r) => [r.source.replace(/^\/+/, "").toLowerCase(), r.destination]
  )
);

const PATH_MAP = new Map(
  DELETED_URL_REDIRECTS.map((r) => [r.source.replace(/\/+$/, "").toLowerCase(), r.destination])
);

/**
 * @param {string} rawSlug flat product slug (no leading slash)
 * @returns {string|null} destination path
 */
export function resolveDeletedFlatSlug(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (!slug || slug.includes("/")) return null;
  return FLAT_MAP.get(slug) || null;
}

/**
 * @param {string} pathname request path
 * @returns {string|null} destination path
 */
export function resolveDeletedPath(pathname) {
  const path = String(pathname || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  return PATH_MAP.get(path) || null;
}
