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

/**
 * Best-effort geo via ip-api.com (no key, HTTP). Never throws; skips private IPs.
 */
export async function lookupIpGeo(ip, { timeoutMs = 1500 } = {}) {
  const clean = String(ip || "").trim();
  if (!isPublicIp(clean)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,countryCode,regionName,city,isp,query`;
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || data.status !== "success") return null;
    return {
      ip: String(data.query || clean).slice(0, 64),
      city: String(data.city || "").slice(0, 80),
      region: String(data.regionName || "").slice(0, 80),
      country: String(data.country || "").slice(0, 80),
      countryCode: String(data.countryCode || "").slice(0, 8),
      isp: String(data.isp || "").slice(0, 120),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full snapshot to stamp on Order at checkout.
 */
export async function customerNetworkFromRequest(request) {
  const ip = clientIpFromHeaders(request);
  const userAgent = clientUserAgent(request);
  const device = deviceLabelFromUserAgent(userAgent);
  const geo = ip ? await lookupIpGeo(ip) : null;
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
