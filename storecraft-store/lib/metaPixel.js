/**
 * Meta Pixel (fbq) helpers — client-only.
 * Pixel ID comes from settings via AnalyticsScripts init; never hardcode IDs here.
 * Browser events also mirror to Conversions API via /api/meta/capi with the same event_id.
 */

export const META_PIXEL_CURRENCY = "PKR";

export function isMetaPixelReady() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

export function newMetaEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function readCookie(name) {
  if (typeof document === "undefined") return "";
  const target = String(name || "").trim();
  if (!target) return "";
  const parts = String(document.cookie || "").split(";");
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k !== target) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return part.slice(i + 1).trim();
    }
  }
  return "";
}

export function getMetaClickIds() {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
  };
}

/**
 * Fire-and-forget server Conversions API (deduped with Pixel via event_id).
 */
export function mirrorMetaCapi({
  eventName,
  eventId,
  customData,
  email,
  phone,
  firstName,
  lastName,
  city,
  state,
  zip,
} = {}) {
  if (typeof window === "undefined") return;
  const name = String(eventName || "").trim();
  if (!name) return;
  const { fbp, fbc } = getMetaClickIds();
  const payload = {
    eventName: name,
    eventId: String(eventId || newMetaEventId()),
    eventSourceUrl: String(window.location.href || "").slice(0, 2048),
    customData: customData && typeof customData === "object" ? customData : undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    email: email || undefined,
    phone: phone || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
  };
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/meta/capi", blob)) return;
    }
    void fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [params]
 * @param {{ eventId?: string, skipCapi?: boolean, user?: object }} [options]
 * @returns {string|false} eventId when fired
 */
export function trackMetaPixel(event, params, options = {}) {
  const eventId = String(options.eventId || newMetaEventId());
  const eventOptions = { eventID: eventId };
  let pixelOk = false;
  if (isMetaPixelReady()) {
    try {
      if (params && Object.keys(params).length) {
        window.fbq("track", event, params, eventOptions);
      } else {
        window.fbq("track", event, {}, eventOptions);
      }
      pixelOk = true;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[Meta Pixel]", event, params || {}, eventId);
      }
    } catch {
      pixelOk = false;
    }
  }
  if (!options.skipCapi) {
    mirrorMetaCapi({
      eventName: event,
      eventId,
      customData: params,
      ...(options.user || {}),
    });
  }
  return pixelOk || !options.skipCapi ? eventId : false;
}

export function trackPageView(options = {}) {
  return trackMetaPixel("PageView", undefined, options);
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

export function trackViewContent({ contentIds, value, currency = META_PIXEL_CURRENCY, eventId, skipCapi } = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  return trackMetaPixel(
    "ViewContent",
    {
      content_ids: ids,
      content_type: "product",
      value: money(value),
      currency,
    },
    { eventId, skipCapi }
  );
}

export function trackAddToCart({
  contentIds,
  value,
  quantity = 1,
  currency = META_PIXEL_CURRENCY,
  eventId,
  skipCapi,
} = {}) {
  const ids = normalizeIds(contentIds);
  if (!ids.length) return false;
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  return trackMetaPixel(
    "AddToCart",
    {
      content_ids: ids,
      content_type: "product",
      value: money(value),
      currency,
      contents: ids.map((id) => ({ id, quantity: qty })),
      num_items: qty,
    },
    { eventId, skipCapi }
  );
}

export function trackInitiateCheckout({
  contentIds,
  value,
  numItems,
  currency = META_PIXEL_CURRENCY,
  eventId,
  skipCapi,
  user,
} = {}) {
  const ids = normalizeIds(contentIds);
  const params = {
    content_type: "product",
    value: money(value),
    currency,
    num_items: Math.max(0, Number(numItems) || 0),
  };
  if (ids.length) params.content_ids = ids;
  return trackMetaPixel("InitiateCheckout", params, { eventId, skipCapi, user });
}

/**
 * Purchase — use the real order grand total (after shipping/discounts), not cart subtotal.
 * Pass the same eventId the server used for CAPI so Meta dedupes.
 */
export function trackPurchase({
  contentIds,
  value,
  orderId,
  numItems,
  currency = META_PIXEL_CURRENCY,
  eventId,
  skipCapi,
  user,
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
  return trackMetaPixel("Purchase", params, { eventId, skipCapi, user });
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
