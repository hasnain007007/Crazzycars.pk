/**
 * Shopify-era / shortened category handles → canonical Mongo slugs.
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
  "led-lights": "led-lighting",
  "car-lights": "led-lighting",
  "car-care": "car-care-safety",
  "steering-covers": "steering-wheel-covers",
  "phone-holders": "mobile-holders-chargers",
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
 * Rewrite stored nav/footer hrefs that still point at missing short handles.
 * Unknown paths are left unchanged.
 */
export function rewriteStorePath(href) {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return raw;
  }
  const hashIndex = raw.indexOf("#");
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const [pathPart, queryPart] = withoutHash.split("?");
  const pathOnly = pathPart.replace(/\/+$/, "") || "/";
  const parts = pathOnly.toLowerCase().split("/").filter(Boolean);
  const qs = queryPart ? `?${queryPart}` : "";

  let next = pathOnly;
  if (parts[0] === "categories" && parts[1] && parts.length === 2) {
    const canon = aliasedCategorySlug(parts[1]);
    if (canon) next = `/categories/${canon}`;
  } else if (parts[0] === "collections" && parts[1] && parts.length === 2) {
    const canon = aliasedCategorySlug(parts[1]);
    if (canon) next = `/categories/${canon}`;
  } else if (parts[0] === "pages" && parts[1] && parts.length === 2) {
    const canon = aliasedCategorySlug(parts[1]);
    if (canon) next = `/categories/${canon}`;
  } else if (parts.length === 1) {
    const canon = aliasedCategorySlug(parts[0]);
    if (canon) next = `/categories/${canon}`;
  }

  return `${next}${qs}${hash}`;
}

/** Static 308s for next.config — must run before the generic `/pages/:slug` rule. */
export function buildCategoryAliasRedirects() {
  const seen = new Set();
  const redirects = [];
  for (const [handle, slug] of Object.entries(CATEGORY_HANDLE_ALIASES)) {
    const dest = `/categories/${slug}`;
    const sources = [
      `/${handle}`,
      `/pages/${handle}`,
      `/categories/${handle}`,
      `/collections/${handle}`,
    ];
    for (const source of sources) {
      if (source === dest || seen.has(source)) continue;
      seen.add(source);
      redirects.push({ source, destination: dest, permanent: true });
    }
  }
  return redirects;
}
