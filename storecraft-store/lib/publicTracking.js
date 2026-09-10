/**
 * Public tracking helpers — storefront-only URLs + sanitized API payloads.
 */

const DEFAULT_STORE_ORIGIN = "https://crazzycars.pk";

function cleanOrigin(raw) {
  return String(raw || "")
    .trim()
    .replace(/\/$/, "");
}

function hostnameOf(raw) {
  try {
    const withProto = /:\/\//.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** True when a URL/host is an admin panel (customers must never land here). */
export function isAdminTrackingHost(raw) {
  const host = hostnameOf(raw);
  if (!host) return /admin\./i.test(String(raw || ""));
  return host.startsWith("admin.") || host.includes(".admin.");
}

/**
 * Customer-facing tracking page — always the public storefront.
 * Never returns admin.crazzycars.pk (legacy Shopify bridge removed).
 */
export function storefrontTrackingUrl(trackingNumber, storeUrl = "") {
  const id = String(trackingNumber || "").trim();
  if (!id) return "";

  const candidates = [
    storeUrl,
    process.env.NEXT_PUBLIC_STORE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_TRACKING_PAGE_URL,
    DEFAULT_STORE_ORIGIN,
  ];

  let base = "";
  for (const c of candidates) {
    const cleaned = cleanOrigin(c);
    if (!cleaned) continue;
    if (isAdminTrackingHost(cleaned)) continue;
    // Dedicated tracking page URL may already include /track-order
    if (/\/track-order$/i.test(cleaned)) {
      base = cleaned;
      break;
    }
    base = cleaned;
    break;
  }

  if (!base) base = DEFAULT_STORE_ORIGIN;
  if (/\/track-order$/i.test(base)) {
    return `${base}?tracking=${encodeURIComponent(id)}`;
  }
  return `${base}/track-order?tracking=${encodeURIComponent(id)}`;
}

/** Strict tracking id for public lookups (blocks junk / injection). */
export function normalizePublicTrackingNumber(raw) {
  const tn = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  if (tn.length < 6 || tn.length > 40) return "";
  return tn;
}

/**
 * Strip anything that could leak PII or internal courier payloads.
 * Public clients only need status + timeline cities.
 */
export function toPublicTrackingPayload(result, { orderNumber = "" } = {}) {
  if (!result?.success) {
    return {
      success: false,
      error: result?.error || "Invalid tracking number",
    };
  }

  const events = Array.isArray(result.events)
    ? result.events.slice(0, 40).map((e) => ({
        date: String(e?.date || "").slice(0, 32),
        time: String(e?.time || "").slice(0, 16),
        status: String(e?.status || "").slice(0, 120),
        location: String(e?.location || "").slice(0, 80),
        description: String(e?.description || e?.status || "").slice(0, 200),
      }))
    : [];

  return {
    success: true,
    trackingNumber: String(result.trackingNumber || "").slice(0, 40),
    status: String(result.status || "").slice(0, 120),
    statusCode: String(result.statusCode || "").slice(0, 32),
    courier: String(result.courier || "").slice(0, 64),
    events,
    estimatedDelivery: String(result.estimatedDelivery || "").slice(0, 64),
    origin: String(result.origin || "").slice(0, 80),
    destination: String(result.destination || "").slice(0, 80),
    currentLocation: String(result.currentLocation || "").slice(0, 80),
    orderNumber: String(orderNumber || result.orderNumber || "").slice(0, 40),
  };
}

/** Simple in-memory rate limit (per process) for public tracking. */
const hits = new Map();

export function checkPublicTrackingRateLimit(ip, { max = 30, windowMs = 60_000 } = {}) {
  const key = String(ip || "unknown").slice(0, 64);
  const now = Date.now();
  let row = hits.get(key);
  if (!row || now - row.started >= windowMs) {
    row = { started: now, count: 0 };
    hits.set(key, row);
  }
  row.count += 1;
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now - v.started >= windowMs) hits.delete(k);
    }
  }
  if (row.count > max) {
    return { limited: true, remainingMs: Math.max(0, windowMs - (now - row.started)) };
  }
  return { limited: false, remainingMs: 0 };
}

export function clientIpFromRequest(request) {
  const xf = request.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}
