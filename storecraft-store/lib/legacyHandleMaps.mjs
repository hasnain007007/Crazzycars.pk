/**
 * Shopify-era / shortened handles → canonical storefront paths.
 * Keep this file free of `@/` imports so next.config.mjs can reuse it.
 */

export const CATEGORY_HANDLE_ALIASES = {
  "body-kit": "body-kits-extensions",
  "body-kits": "body-kits-extensions",
  bodykits: "body-kits-extensions",
  "body-kits-and-extensions": "body-kits-extensions",
  "car-body-kit": "body-kits-extensions",
  "car-body-kits": "body-kits-extensions",
  "car-lighting": "led-lighting",
  lighting: "led-lighting",
  "led-lights": "led-lighting",
  "car-lights": "led-lighting",
  headlights: "led-headlights-bulbs",
  "led-headlights": "led-headlights-bulbs",
  "fog-lights": "fog-lamps-drl-covers",
  "fog-lamps": "fog-lamps-drl-covers",
  "car-care": "car-care-safety",
  "steering-covers": "steering-wheel-covers",
  "phone-holders": "mobile-holders-chargers",
  louvers: "quarter-window-louvers",
  "window-louvers": "quarter-window-louvers",
  "mirror-covers": "side-mirror-covers",
  "side-mirror": "side-mirror-covers",
  "side-skirts": "splitters-side-skirts",
  carbon: "carbon-fiber",
  "exhaust-tips": "exhaust-systems-tips",
  "door-handles": "door-handle-covers",
  grilles: "front-grilles",
  grille: "front-grilles",
  "fender-lights": "fender-light",
  curtains: "car-curtains",
  perfume: "fragrances",
  perfumes: "fragrances",
  "shift-knobs": "shift-knob-accessories",
  organizers: "car-organizers",
  "air-freshener": "air-freshener-decoration",
  "air-freshner": "air-freshener-decoration",
};

/** Shopify collection handle → Vehicle.slug (covers Mongo docs missing shopifyHandle). */
export const VEHICLE_HANDLE_ALIASES = {
  "toyota-corolla-2009-2014-accessories": "toyota-corolla-e140-2009-2014",
  "toyota-corolla-e170-2014-2020-accessories": "toyota-corolla-e170-2014-2026",
  "toyota-yaris-accessories-shop-online-crazzycars-pk": "toyota-yaris-2020-present",
  "toyota-aqua-accessories-shop-online-crazzycars-pk": "toyota-aqua-2012-present",
  "toyota-vitz-accessories-shop-online-crazzycars-pk": "toyota-vitz-2012-present",
  "honda-civic-reborn-2006-2012-accessories": "honda-civic-reborn-2006-2012",
  "honda-civic-rebirth-2012-2016-accessories-body-kits": "honda-civic-rebirth-2012-2016",
  "honda-civic-x-2016-2021-accessories-body-kits": "honda-civic-x-2016-2021",
  "honda-civic-11th-gen-2022-present-accessories": "honda-civic-11th-gen-2022-present",
  "honda-city-2016-accessories-body-kits": "honda-city-classic-2009-2020",
  "honda-city": "honda-city-2021-present",
  "hyundai-elantra-2020-2024-accessories": "hyundai-elantra-2020-2024",
  "hyundai-elantra-hybrid-2025-present-accessories": "hyundai-elantra-hybrid-2025-present",
  "hyundai-sonata-2020-2024-accessories": "hyundai-sonata-2020-2024",
  "haval-h6-accessories-crazzycars-pk": "haval-h6-2021-present",
  "suzuki-alto-2020-accessories": "suzuki-alto-2020-present",
  "suzuki-swift-2025-present-accessories": "suzuki-swift-2025-present",
};

/** Brand-level Shopify collections → shop-by-car index. */
export const MAKE_HANDLE_ALIASES = {
  "toyota-accessories-shop-by-model-crazzycars-pk": "/cars",
  "honda-accessories-shop-by-model-crazzycars-pk": "/cars",
  "hyundai-accessories-shop-by-model-crazzycars-pk": "/cars",
  "suzuki-accessories-shop-by-model-crazzycars-pk": "/cars",
  "toyota-car-accessories": "/cars",
  "honda-civic-accessories": "/cars",
};

/** CMS / merchandising leftovers that are not categories. */
export const PAGE_HANDLE_ALIASES = {
  deals: "/sale",
  "new-arrivals": "/shop",
  "best-sellers": "/shop",
  "best-car-accessories-deals": "/sale",
  "features-products": "/shop",
};

export function normalizeCategoryHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function aliasedCategorySlug(handle) {
  const key = normalizeCategoryHandle(handle);
  if (!key) return null;
  return CATEGORY_HANDLE_ALIASES[key] || null;
}

/**
 * Sync destination for a leftover handle (no DB).
 * @returns {string|null} absolute path starting with /
 */
export function resolveLegacyDestination(rawHandle) {
  const handle = normalizeCategoryHandle(rawHandle);
  if (!handle) return null;
  if (PAGE_HANDLE_ALIASES[handle]) return PAGE_HANDLE_ALIASES[handle];
  if (MAKE_HANDLE_ALIASES[handle]) return MAKE_HANDLE_ALIASES[handle];
  if (VEHICLE_HANDLE_ALIASES[handle]) return `/cars/${VEHICLE_HANDLE_ALIASES[handle]}`;
  const cat = aliasedCategorySlug(handle);
  if (cat) return `/categories/${cat}`;
  return null;
}

/**
 * Rewrite stored nav/footer hrefs that still point at missing short handles.
 * Unknown paths are left unchanged.
 */
export function rewriteStorePath(href) {
  const raw = String(href || "").trim();
  if (
    !raw ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:")
  ) {
    return raw;
  }
  const hashIndex = raw.indexOf("#");
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const [pathPart, queryPart] = withoutHash.split("?");
  const pathOnly = pathPart.replace(/\/+$/, "") || "/";
  const parts = pathOnly.toLowerCase().split("/").filter(Boolean);
  const qs = queryPart ? `?${queryPart}` : "";

  let handle = null;
  if (parts.length === 1) handle = parts[0];
  else if (
    parts.length === 2 &&
    ["categories", "collections", "pages", "cars"].includes(parts[0])
  ) {
    handle = parts[1];
  }

  let next = pathOnly;
  if (handle) {
    const dest = resolveLegacyDestination(handle);
    if (dest) next = dest;
  }

  return `${next}${qs}${hash}`;
}

function pushRedirect(out, seen, source, destination) {
  if (!source || !destination || source === destination || seen.has(source)) return;
  seen.add(source);
  out.push({ source, destination, permanent: true });
}

/** Static 308s for next.config — must run before the generic `/pages/:slug` rule. */
export function buildLegacyRedirects() {
  const seen = new Set();
  const redirects = [];

  for (const [handle, slug] of Object.entries(CATEGORY_HANDLE_ALIASES)) {
    const dest = `/categories/${slug}`;
    for (const source of [`/${handle}`, `/pages/${handle}`, `/categories/${handle}`, `/collections/${handle}`]) {
      pushRedirect(redirects, seen, source, dest);
    }
  }

  for (const [handle, slug] of Object.entries(VEHICLE_HANDLE_ALIASES)) {
    const dest = `/cars/${slug}`;
    for (const source of [
      `/${handle}`,
      `/pages/${handle}`,
      `/categories/${handle}`,
      `/collections/${handle}`,
      `/cars/${handle}`,
    ]) {
      pushRedirect(redirects, seen, source, dest);
    }
  }

  for (const [handle, dest] of Object.entries(MAKE_HANDLE_ALIASES)) {
    for (const source of [`/${handle}`, `/pages/${handle}`, `/categories/${handle}`, `/collections/${handle}`]) {
      pushRedirect(redirects, seen, source, dest);
    }
  }

  for (const [handle, dest] of Object.entries(PAGE_HANDLE_ALIASES)) {
    for (const source of [`/${handle}`, `/pages/${handle}`, `/collections/${handle}`]) {
      pushRedirect(redirects, seen, source, dest);
    }
  }

  return redirects;
}
