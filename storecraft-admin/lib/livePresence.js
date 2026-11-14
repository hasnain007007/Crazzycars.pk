/**
 * Shared live-visitor window (seconds). Heartbeats older than this are not "live".
 */
export const LIVE_VISITOR_WINDOW_MS = 90_000;

export function liveSinceDate(now = new Date()) {
  return new Date(now.getTime() - LIVE_VISITOR_WINDOW_MS);
}

/** Fixed storefront pages → names the owner recognises. */
const PAGE_NAMES = {
  "/": "Home page",
  "/shop": "Shop (all products)",
  "/sale": "Sale",
  "/checkout": "Checkout",
  "/cart": "Cart",
  "/track-order": "Track order",
  "/wishlist": "Wishlist",
  "/compare": "Compare",
  "/search": "Search",
  "/cars": "Shop by car",
  "/blogs": "Blog",
  "/contact": "Contact",
  "/about": "About us",
  "/faq": "FAQ",
  "/account": "My account",
  "/account/login": "Sign in",
  "/account/register": "Create account",
  "/cash-on-delivery": "Cash on delivery info",
  "/advance-payment": "Advance payment info",
  "/shipping-policy": "Shipping policy",
  "/returns-policy": "Returns policy",
  "/order-confirmation": "Order confirmation",
};

/**
 * Slugs worth looking up by name: a single-segment path may be a product (/<slug>),
 * /products/<handle> an old Shopify link, /collections|categories/<slug> a category.
 */
export function slugsFromPaths(paths) {
  const products = new Set();
  const categories = new Set();
  for (const raw of paths) {
    const path = String(raw || "").split("?")[0].replace(/\/+$/, "") || "/";
    if (PAGE_NAMES[path]) continue;
    let m = path.match(/^\/products\/([^/]+)$/);
    if (m) {
      products.add(decodeURIComponent(m[1]));
      continue;
    }
    m = path.match(/^\/(collections|categories)\/([^/]+)$/);
    if (m) {
      categories.add(decodeURIComponent(m[2]));
      continue;
    }
    m = path.match(/^\/([^/]+)$/);
    if (m) products.add(decodeURIComponent(m[1]));
  }
  return { products: [...products], categories: [...categories] };
}

/**
 * Readable name for a storefront path.
 * @param {string} rawPath
 * @param {{ products?: Record<string,string>, categories?: Record<string,string> }} names slug → name
 * @returns {{ label: string, kind: "page" | "product" | "category" | "checkout" | "other" }}
 */
export function pageLabel(rawPath, names = {}) {
  const path = String(rawPath || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (path.startsWith("/checkout")) {
    return { label: path === "/checkout" ? "Checkout" : "Order placed (thank-you page)", kind: "checkout" };
  }
  if (PAGE_NAMES[path]) return { label: PAGE_NAMES[path], kind: "page" };
  const products = names.products || {};
  const categories = names.categories || {};
  let m = path.match(/^\/(collections|categories)\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[2]);
    return { label: categories[slug] ? `Category: ${categories[slug]}` : `Category: ${slug}`, kind: "category" };
  }
  m = path.match(/^\/(?:products\/)?([^/]+)$/);
  if (m && products[decodeURIComponent(m[1])]) return { label: products[decodeURIComponent(m[1])], kind: "product" };
  m = path.match(/^\/cars\/(.+)$/);
  if (m) return { label: `Car: ${decodeURIComponent(m[1]).replace(/[/-]+/g, " ")}`, kind: "category" };
  m = path.match(/^\/blogs\/(.+)$/);
  if (m) return { label: `Blog: ${decodeURIComponent(m[1]).replace(/-+/g, " ")}`, kind: "page" };
  return { label: path, kind: "other" };
}

/** "Lahore, Punjab" / "Pakistan" / "" */
export function placeLabel({ city, region, country, countryCode } = {}) {
  const c = String(city || "").trim();
  const r = String(region || "").trim();
  const n = String(country || countryCode || "").trim();
  const foreign = countryCode && String(countryCode).toUpperCase() !== "PK";
  if (c) return [c, r && r !== c ? r : "", foreign ? n : ""].filter(Boolean).join(", ");
  if (r) return [r, foreign ? n : ""].filter(Boolean).join(", ");
  return n;
}

/** Group visitors by city for the summary line: [{ place, count }] biggest first. */
export function countByPlace(visitors) {
  const counts = new Map();
  for (const v of visitors) {
    const place = String(v.city || v.region || v.country || "").trim() || "Unknown";
    counts.set(place, (counts.get(place) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([place, count]) => ({ place, count }))
    .sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));
}

/** ISP company names from the IP lookup → the brand people know. */
const NETWORKS = [
  [/pmcl|mobilink|jazz/i, "Jazz"],
  [/cmpak|zong|china mobile pak/i, "Zong"],
  [/telenor/i, "Telenor"],
  [/pak telecom mobile|ufone/i, "Ufone"],
  [/pakistan telecommunication|ptcl/i, "PTCL"],
  [/nayatel/i, "Nayatel"],
  [/cyber internet|stormfiber/i, "StormFiber"],
  [/wateen/i, "Wateen"],
  [/transworld/i, "Transworld"],
  [/fiberlink|fiber link/i, "Fiberlink"],
  [/multinet/i, "Multinet"],
];

export function networkLabel(isp) {
  const s = String(isp || "").trim();
  if (!s) return "";
  const hit = NETWORKS.find(([re]) => re.test(s));
  return hit ? hit[1] : s.replace(/\b(limited|ltd\.?|private|pvt\.?|\(pvt\)|inc\.?|llc|company)\b/gi, "").replace(/\s+/g, " ").trim().slice(0, 40);
}
