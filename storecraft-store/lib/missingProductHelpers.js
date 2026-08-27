/** Static 404 shortcuts — no Mongo. Keep in sync with live top categories. */
export const FAST_404_CATEGORIES = [
  { slug: "splitters-side-skirts", name: "Splitters & Side Skirts" },
  { slug: "led-lighting", name: "LED & Lighting" },
  { slug: "side-mirror-covers", name: "Side Mirror Covers" },
  { slug: "body-kits-extensions", name: "Body Kits & Extensions" },
  { slug: "spoilers-diffusers", name: "Spoilers & Diffusers" },
  { slug: "interior", name: "Interior" },
];

const RESERVED_SINGLE = new Set([
  "shop",
  "cart",
  "checkout",
  "account",
  "login",
  "register",
  "contact",
  "about",
  "faq",
  "sale",
  "search",
  "blogs",
  "blog",
  "cars",
  "categories",
  "collections",
  "products",
  "pages",
  "posts",
]);

export function slugFromPathname(pathname) {
  const raw = String(pathname || "").trim();
  const path = raw.split("?")[0].replace(/^\/+|\/+$/g, "");
  if (!path) return "";
  if (path.startsWith("products/")) {
    const rest = path.slice("products/".length);
    if (rest && !rest.includes("/")) return rest;
    return "";
  }
  if (path.includes("/")) return "";
  return path;
}

/** Hyphenated catalog-style slug, not a reserved single word. */
export function looksLikeProductSlug(slug) {
  const s = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (!s || s.length < 8 || s.length > 180) return false;
  if (RESERVED_SINGLE.has(s)) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s)) return false;
  const hyphens = (s.match(/-/g) || []).length;
  return hyphens >= 2;
}

export function slugParamToSearchQuery(slug) {
  return String(slug || "")
    .replace(/-crazzycars-pk$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(crazzycars|crazzy|cars\.pk)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(doc) {
  return `${doc?.name || ""} ${String(doc?.slug || "").replace(/-/g, " ")}`.toLowerCase();
}

function tokenPresent(hay, token) {
  const t = String(token || "").toLowerCase();
  if (!t) return false;
  return hay.includes(t);
}

/**
 * Only keep suggestions that share make/model (when the slug has them)
 * and beat a score floor. Wrong-car matches are worse than an empty list.
 */
export function isConfidentMissingSuggestion(doc, parsed, smart) {
  if (!doc?.slug || !doc?.name) return false;
  if (Number(smart) < 240) return false;

  const hay = haystack(doc);
  if (parsed.makeTokens?.length && !parsed.makeTokens.some((m) => tokenPresent(hay, m))) {
    return false;
  }
  if (parsed.modelTokens?.length && !parsed.modelTokens.some((m) => tokenPresent(hay, m))) {
    return false;
  }
  if (parsed.typeTokens?.length) {
    const typeHits = parsed.typeTokens.filter((t) => tokenPresent(hay, t)).length;
    if (typeHits < 1) return false;
  } else {
    const tokens = parsed.significantTokens?.length
      ? parsed.significantTokens
      : parsed.tokens || [];
    if (tokens.length >= 3) {
      const hits = tokens.filter((t) => tokenPresent(hay, t)).length;
      if (hits / tokens.length < 0.55) return false;
    }
  }
  return true;
}
