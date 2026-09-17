/** Private + thin / duplicate-prone surfaces. */
export const ROBOTS_PRIVATE_PATHS = [
  "/api/",
  "/account/",
  "/checkout/",
  "/cart/",
  "/admin/",
  "/wishlist",
  "/compare",
  "/search",
  "/track-order",
  "/order-confirmation",
];

/**
 * Listing facet query params — Google-supported wildcard Disallow patterns.
 * Pagination (`page=`) is intentionally allowed: page-only listings are indexable.
 * Does not block CSS/JS (path-based, not extension-based).
 */
export const ROBOTS_FILTER_QUERY_DISALLOWS = [
  "/*?*sort=",
  "/*?*q=",
  "/*?*search=",
  "/*?*view=",
  "/*?*per_page=",
  "/*?*show=",
  "/*?*brand=",
  "/*?*make=",
  "/*?*model=",
  "/*?*carmake=",
  "/*?*carmodel=",
  "/*?*caryear=",
  "/*?*year=",
  "/*?*min=",
  "/*?*max=",
  "/*?*pricefrom=",
  "/*?*priceto=",
  "/*?*minprice=",
  "/*?*maxprice=",
  "/*?*instock=",
  "/*?*outofstock=",
  "/*?*sale=",
  "/*?*deals=",
  "/*?*category=",
  "/*?*filter=",
];

export function buildRobotsDisallowList() {
  return [...ROBOTS_PRIVATE_PATHS, ...ROBOTS_FILTER_QUERY_DISALLOWS];
}
