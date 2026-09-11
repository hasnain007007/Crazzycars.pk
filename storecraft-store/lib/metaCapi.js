/**
 * Meta Conversions API (server-side) — pairs with client Pixel via shared event_id.
 * Token: META_CAPI_ACCESS_TOKEN env, or Settings.seo.metaCapiAccessToken (admin only).
 */
import { createHash, randomUUID } from "crypto";
import { buildFbcFromFbclid } from "@/lib/metaClickIds";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

export const META_CAPI_CURRENCY = "PKR";

const ALLOWED_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Search",
  "Lead",
  "CompleteRegistration",
]);

export function isAllowedMetaEvent(name) {
  return ALLOWED_EVENTS.has(String(name || "").trim());
}

export function newMetaEventId() {
  try {
    return randomUUID();
  } catch {
    return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function sha256Hex(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return undefined;
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Digits-only E.164-ish for Pakistan mobiles (92xxxxxxxxxx). */
export function normalizePhoneForMeta(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("3")) d = `92${d}`;
  return d;
}

export function hashUserData({
  email,
  phone,
  firstName,
  lastName,
  city,
  state,
  zip,
  country = "pk",
  externalId,
  fbp,
  fbc,
  clientIpAddress,
  clientUserAgent,
} = {}) {
  const user_data = {};
  const em = sha256Hex(String(email || "").trim().toLowerCase());
  if (em) user_data.em = [em];
  const ph = sha256Hex(normalizePhoneForMeta(phone));
  if (ph) user_data.ph = [ph];
  const fn = sha256Hex(String(firstName || "").trim());
  if (fn) user_data.fn = [fn];
  const ln = sha256Hex(String(lastName || "").trim());
  if (ln) user_data.ln = [ln];
  const ct = sha256Hex(String(city || "").trim());
  if (ct) user_data.ct = [ct];
  const st = sha256Hex(String(state || "").trim());
  if (st) user_data.st = [st];
  const zp = sha256Hex(String(zip || "").replace(/\s+/g, ""));
  if (zp) user_data.zp = [zp];
  const countryHash = sha256Hex(String(country || "pk").trim());
  if (countryHash) user_data.country = [countryHash];
  const ext = sha256Hex(String(externalId || "").trim());
  if (ext) user_data.external_id = [ext];
  const fbpVal = String(fbp || "").trim();
  if (fbpVal) user_data.fbp = fbpVal;
  const fbcVal = String(fbc || "").trim();
  if (fbcVal) user_data.fbc = fbcVal;
  const ip = String(clientIpAddress || "").trim();
  if (ip) user_data.client_ip_address = ip;
  const ua = String(clientUserAgent || "").trim();
  if (ua) user_data.client_user_agent = ua;
  return user_data;
}

export function readMetaCookiesFromRequest(request) {
  const cookieHeader = request?.headers?.get?.("cookie") || "";
  const map = Object.create(null);
  for (const part of String(cookieHeader).split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) map[k] = decodeURIComponent(v);
  }
  return {
    fbp: String(map._fbp || "").trim(),
    fbc: String(map._fbc || "").trim(),
  };
}

/**
 * Build Meta `_fbc` from fbclid: fb.1.{ms}.{fbclid}
 */
export { buildFbcFromFbclid } from "@/lib/metaClickIds";

export async function resolveMetaCapiConfig(settingsDoc) {
  let seo = settingsDoc?.seo;
  if (!seo) {
    try {
      const doc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("seo").lean();
      seo = doc?.seo || {};
    } catch {
      seo = {};
    }
  }
  const pixelId = String(
    process.env.META_PIXEL_ID || seo?.facebookPixelId || ""
  ).trim();
  const accessToken = String(
    process.env.META_CAPI_ACCESS_TOKEN || seo?.metaCapiAccessToken || ""
  ).trim();
  const testEventCode = String(
    process.env.META_CAPI_TEST_EVENT_CODE || seo?.metaCapiTestEventCode || ""
  ).trim();
  const apiVersion = String(process.env.META_GRAPH_API_VERSION || "v21.0").trim() || "v21.0";
  return { pixelId, accessToken, testEventCode, apiVersion, enabled: Boolean(pixelId && accessToken) };
}

/**
 * @param {object} opts
 * @param {string} opts.eventName
 * @param {string} [opts.eventId]
 * @param {string} [opts.eventSourceUrl]
 * @param {object} [opts.userData] — already hashed / Meta-ready
 * @param {object} [opts.customData]
 * @param {object} [opts.config] — from resolveMetaCapiConfig
 * @param {number} [opts.eventTime] — unix seconds
 */
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData = {},
  customData,
  config,
  eventTime,
} = {}) {
  const name = String(eventName || "").trim();
  if (!isAllowedMetaEvent(name)) {
    return { ok: false, skipped: true, reason: "unsupported_event" };
  }
  const cfg = config || (await resolveMetaCapiConfig());
  if (!cfg.enabled) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  const event = {
    event_name: name,
    event_time: Math.floor(Number(eventTime) || Date.now() / 1000),
    event_id: String(eventId || newMetaEventId()),
    action_source: "website",
    user_data: userData && typeof userData === "object" ? userData : {},
  };
  const url = String(eventSourceUrl || "").trim();
  if (url) event.event_source_url = url.slice(0, 2048);
  if (customData && typeof customData === "object" && Object.keys(customData).length) {
    event.custom_data = customData;
  }

  const body = { data: [event] };
  if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;

  const endpoint = `https://graph.facebook.com/${cfg.apiVersion}/${encodeURIComponent(cfg.pixelId)}/events`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: cfg.accessToken }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      console.error("[Meta CAPI]", name, json?.error || res.status);
      return { ok: false, skipped: false, error: json?.error || { message: `HTTP ${res.status}` }, eventId: event.event_id };
    }
    return { ok: true, eventId: event.event_id, eventsReceived: json?.events_received, fbtrace_id: json?.fbtrace_id };
  } catch (err) {
    console.error("[Meta CAPI] network", err?.message || err);
    return { ok: false, skipped: false, error: { message: err?.message || "network" }, eventId: event.event_id };
  }
}

export function moneyMeta(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function buildPurchaseCustomData({ value, currency = META_CAPI_CURRENCY, contentIds, contents, numItems, orderId } = {}) {
  const custom = {
    currency: currency || META_CAPI_CURRENCY,
    value: moneyMeta(value),
    content_type: "product",
  };
  const ids = Array.isArray(contentIds)
    ? [...new Set(contentIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  if (ids.length) custom.content_ids = ids;
  if (Array.isArray(contents) && contents.length) custom.contents = contents;
  if (numItems != null) custom.num_items = Math.max(0, Number(numItems) || 0);
  if (orderId) custom.order_id = String(orderId);
  return custom;
}
