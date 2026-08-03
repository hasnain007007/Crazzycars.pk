/**
 * Shared sale-page / homepage sale-section tab definitions.
 * Keep query params aligned with /api/products (minDiscount / maxPrice).
 */

export const SALE_SSR_LIMIT = 32;
export const SALE_DEFAULT_TAB = "30off";

/** @typedef {{ id: string, label: string, query: string, minDiscount?: number, maxPrice?: number }} SaleTab */

/** @type {SaleTab[]} */
export const SALE_TABS = [
  { id: "50off", label: "50% Off", query: "minDiscount=50", minDiscount: 50 },
  { id: "30off", label: "30% Off", query: "minDiscount=30", minDiscount: 30 },
  { id: "under2000", label: "Under Rs. 2,000", query: "maxPrice=2000", maxPrice: 2000 },
  { id: "under5000", label: "Under Rs. 5,000", query: "maxPrice=5000", maxPrice: 5000 },
];

/** Old bookmarks / homepage links → current tab ids */
const LEGACY_TAB_IDS = {
  under999: "under2000",
  under1999: "under5000",
  off50: "50off",
  off30: "30off",
};

export function resolveSaleTabId(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  const mapped = LEGACY_TAB_IDS[key] || key;
  if (SALE_TABS.some((t) => t.id === mapped)) return mapped;
  return SALE_DEFAULT_TAB;
}

export function getSaleTab(tabId) {
  const id = resolveSaleTabId(tabId);
  return SALE_TABS.find((t) => t.id === id) || SALE_TABS.find((t) => t.id === SALE_DEFAULT_TAB);
}

export function saleApiQueryForTab(tabId, { limit = SALE_SSR_LIMIT } = {}) {
  const tab = getSaleTab(tabId);
  const qs = new URLSearchParams({ status: "active", limit: String(limit) });
  if (tab.minDiscount != null) qs.set("minDiscount", String(tab.minDiscount));
  if (tab.maxPrice != null) qs.set("maxPrice", String(tab.maxPrice));
  return qs.toString();
}
