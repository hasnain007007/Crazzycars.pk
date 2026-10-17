/**
 * Snapchat Pixel (browser) — mirrors Meta event coverage for ads attribution.
 * Requires window.snaptr from AnalyticsScripts after seo.snapchatPixelId is set.
 */

export const SNAP_PIXEL_CURRENCY = "PKR";

export function isSnapPixelReady() {
  return typeof window !== "undefined" && typeof window.snaptr === "function";
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

/**
 * @param {string} event Snap event name (PAGE_VIEW, VIEW_CONTENT, …)
 * @param {Record<string, unknown>} [params]
 */
export function trackSnapPixel(event, params) {
  if (!isSnapPixelReady()) return false;
  try {
    if (params && Object.keys(params).length) {
      window.snaptr("track", event, params);
    } else {
      window.snaptr("track", event);
    }
    return true;
  } catch {
    return false;
  }
}

export function trackSnapPageView() {
  return trackSnapPixel("PAGE_VIEW");
}

export function trackSnapViewContent({ contentIds, value, currency = SNAP_PIXEL_CURRENCY } = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  return trackSnapPixel("VIEW_CONTENT", {
    item_ids: ids,
    price: money(value),
    currency,
  });
}

export function trackSnapAddToCart({
  contentIds,
  value,
  quantity = 1,
  currency = SNAP_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  return trackSnapPixel("ADD_CART", {
    item_ids: ids,
    price: money(value),
    number_items: qty,
    currency,
  });
}

export function trackSnapInitiateCheckout({
  contentIds,
  value,
  numItems,
  currency = SNAP_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  const params = {
    price: money(value),
    currency,
    number_items: Math.max(0, Number(numItems) || 0),
  };
  if (ids.length) params.item_ids = ids;
  return trackSnapPixel("START_CHECKOUT", params);
}

export function trackSnapPurchase({
  contentIds,
  value,
  orderId,
  numItems,
  currency = SNAP_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  const params = {
    price: money(value),
    currency,
    number_items: Math.max(0, Number(numItems) || 0),
  };
  if (ids.length) params.item_ids = ids;
  if (orderId) params.transaction_id = String(orderId);
  return trackSnapPixel("PURCHASE", params);
}
