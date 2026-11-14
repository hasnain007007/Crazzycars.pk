/**
 * Capture customer IP / device at checkout for admin order ops.
 */

const PRIVATE_IP_RE =
  /^(::1|localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|fc00:|fe80:|::ffff:127\.)/i;

export function clientIpFromHeaders(request) {
  if (!request?.headers?.get) return "";
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("true-client-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-client-ip"),
    ...(String(request.headers.get("x-forwarded-for") || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)),
  ];
  for (const raw of candidates) {
    const ip = String(raw || "")
      .trim()
      .replace(/^::ffff:/i, "");
    if (!ip || ip.toLowerCase() === "unknown") continue;
    if (ip.length > 64) continue;
    return ip.slice(0, 64);
  }
  return "";
}

export function clientUserAgent(request) {
  const ua = String(request?.headers?.get?.("user-agent") || "").trim();
  return ua.slice(0, 500);
}

/** Short device label for admin UI (iPhone, Android, Desktop, …). */
export function deviceLabelFromUserAgent(ua) {
  const s = String(ua || "");
  if (!s) return "";
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/Android/i.test(s)) return "Android";
  if (/Windows Phone/i.test(s)) return "Windows Phone";
  if (/Macintosh|Mac OS X/i.test(s)) return "Mac";
  if (/Windows NT/i.test(s)) return "Windows";
  if (/Linux/i.test(s)) return "Linux";
  if (/CrOS/i.test(s)) return "ChromeOS";
  return "Device";
}

function isPublicIp(ip) {
  const s = String(ip || "").trim();
  if (!s) return false;
  if (PRIVATE_IP_RE.test(s)) return false;
  // Very rough IPv4 / IPv6 presence check
  return /[:.]/.test(s);
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const clip = (v, n) => String(v || "").trim().slice(0, n);

/** GeoJS (HTTPS, no key, no published limit). */
async function geoFromGeoJs(ip, timeoutMs) {
  const d = await fetchJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, timeoutMs);
  if (!d || (!d.country_code && !d.city)) return null;
  return {
    ip: clip(d.ip || ip, 64),
    city: clip(d.city, 80),
    region: clip(d.region, 80),
    country: clip(d.country, 80),
    countryCode: clip(d.country_code, 8).toUpperCase(),
    isp: clip(d.organization_name, 120),
  };
}

/** ip-api.com (HTTP, 45 requests/minute) — fallback. */
async function geoFromIpApi(ip, timeoutMs) {
  const d = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,isp,query`,
    timeoutMs
  );
  if (!d || d.status !== "success") return null;
  return {
    ip: clip(d.query || ip, 64),
    city: clip(d.city, 80),
    region: clip(d.regionName, 80),
    country: clip(d.country, 80),
    countryCode: clip(d.countryCode, 8).toUpperCase(),
    isp: clip(d.isp, 120),
  };
}

/**
 * Best-effort city / country / network for a public IP. Never throws; skips private IPs.
 * Tries GeoJS, then ip-api.com.
 */
export async function lookupIpGeo(ip, { timeoutMs = 1500 } = {}) {
  const clean = String(ip || "").trim();
  if (!isPublicIp(clean)) return null;
  return (await geoFromGeoJs(clean, timeoutMs)) || (await geoFromIpApi(clean, timeoutMs));
}

const GEO_CACHE = new Map();
const GEO_CACHE_MAX = 5000;
const GEO_HIT_MS = 24 * 60 * 60 * 1000;
const GEO_MISS_MS = 5 * 60 * 1000;

/**
 * lookupIpGeo with an in-memory cache (a day for hits, 5 min for misses) so live-visitor
 * heartbeats do not repeat the lookup.
 */
export async function cachedIpGeo(ip, opts) {
  const key = String(ip || "").trim();
  if (!isPublicIp(key)) return null;
  const now = Date.now();
  const hit = GEO_CACHE.get(key);
  if (hit && hit.expires > now) return hit.geo;
  const geo = await lookupIpGeo(key, opts);
  if (GEO_CACHE.size >= GEO_CACHE_MAX) GEO_CACHE.delete(GEO_CACHE.keys().next().value);
  GEO_CACHE.set(key, { geo, expires: now + (geo ? GEO_HIT_MS : GEO_MISS_MS) });
  return geo;
}

/**
 * Full snapshot to stamp on Order at checkout.
 */
export async function customerNetworkFromRequest(request) {
  const ip = clientIpFromHeaders(request);
  const userAgent = clientUserAgent(request);
  const device = deviceLabelFromUserAgent(userAgent);
  // Usually cached from the visitor's live-presence heartbeats, so checkout does not wait.
  const geo = ip ? await cachedIpGeo(ip, { timeoutMs: 1200 }) : null;
  return {
    customerIp: ip,
    customerUserAgent: userAgent,
    customerDevice: device,
    customerIpGeo: geo
      ? {
          city: geo.city,
          region: geo.region,
          country: geo.country,
          countryCode: geo.countryCode,
          isp: geo.isp,
        }
      : null,
  };
}

/** Human one-liner for admin list/detail. */
export function formatCustomerIpSummary({
  customerIp,
  customerDevice,
  customerIpGeo,
} = {}) {
  const ip = String(customerIp || "").trim();
  if (!ip) return "";
  const parts = [];
  if (customerDevice) parts.push(customerDevice);
  parts.push(ip);
  const city = customerIpGeo?.city;
  const country = customerIpGeo?.countryCode || customerIpGeo?.country;
  if (city || country) {
    parts.push([city, country].filter(Boolean).join(", "));
  }
  return parts.join(" · ");
}
