/**
 * Meta Pixel (fbq) helpers — client-only.
 * Pixel ID comes from settings via AnalyticsScripts init; never hardcode IDs here.
 */

export const META_PIXEL_CURRENCY = "PKR";

export function isMetaPixelReady() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [params]
 * @returns {boolean}
 */
export function trackMetaPixel(event, params) {
  if (!isMetaPixelReady()) return false;
  try {
    if (params && Object.keys(params).length) {
      window.fbq("track", event, params);
    } else {
      window.fbq("track", event);
    }
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[Meta Pixel]", event, params || {});
    }
    return true;
  } catch {
    return false;
  }
}

export function trackPageView() {
  return trackMetaPixel("PageView");
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Prefer SKU / article number, fall back to Mongo/product id. */
export function resolveProductContentId(productOrRow) {
  if (!productOrRow || typeof productOrRow !== "object") return "";
  return String(
    productOrRow.articleNo ||
      productOrRow.sku ||
      productOrRow.productId ||
      productOrRow._id ||
      productOrRow.id ||
      ""
  ).trim();
}

export function trackViewContent({ contentIds, value, currency = META_PIXEL_CURRENCY } = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  return trackMetaPixel("ViewContent", {
    content_ids: ids,
    content_type: "product",
    value: money(value),
    currency,
  });
}

export function trackAddToCart({
  contentIds,
  value,
  quantity = 1,
  currency = META_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  return trackMetaPixel("AddToCart", {
    content_ids: ids,
    content_type: "product",
    value: money(value),
    currency,
    contents: ids.map((id) => ({ id, quantity: qty })),
    num_items: qty,
  });
}

export function trackInitiateCheckout({
  contentIds,
  value,
  numItems,
  currency = META_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  const params = {
    content_type: "product",
    value: money(value),
    currency,
    num_items: Math.max(0, Number(numItems) || 0),
  };
  if (ids.length) params.content_ids = ids;
  return trackMetaPixel("InitiateCheckout", params);
}

/**
 * Purchase — use the real order grand total (after shipping/discounts), not cart subtotal.
 */
export function trackPurchase({
  contentIds,
  value,
  orderId,
  numItems,
  currency = META_PIXEL_CURRENCY,
} = {}) {
  const ids = normalizeIds(contentIds);
  const params = {
    content_type: "product",
    value: money(value),
    currency,
  };
  if (ids.length) params.content_ids = ids;
  if (orderId) params.order_id = String(orderId);
  if (numItems != null) params.num_items = Math.max(0, Number(numItems) || 0);
  return trackMetaPixel("Purchase", params);
}

/** Fire once per browser tab session for a given key (e.g. Purchase dedupe). */
export function oncePerSession(key, fn) {
  if (typeof window === "undefined") return false;
  const k = String(key || "").trim();
  if (!k) return false;
  try {
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
  } catch {
    /* private mode — still fire */
  }
  fn();
  return true;
}
