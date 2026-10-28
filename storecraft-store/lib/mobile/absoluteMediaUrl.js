/**
 * Normalize media URLs for the mobile API.
 * Relative paths (/media/..., /uploads/...) become absolute using the configured site URL
 * (MEDIA_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL / SITE_URL). Already-absolute http(s) kept
 * (http upgraded to https except for localhost / emulator hosts).
 */
import { getConfiguredSiteUrl } from "../siteUrl.js";
import { getStorePublicOrigin } from "../mediaStorage.js";

function siteOrigin() {
  const fromMedia = String(getStorePublicOrigin() || "").trim().replace(/\/$/, "");
  if (fromMedia) return fromMedia;
  return String(getConfiguredSiteUrl() || "")
    .trim()
    .replace(/\/$/, "");
}

function isLoopbackHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "10.0.2.2" || h === "::1";
}

/** Prefer https for public hosts; keep http for local/emulator origins. */
function preferHttps(urlString) {
  const s = String(urlString || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol === "http:" && !isLoopbackHost(u.hostname)) {
      u.protocol = "https:";
      return u.toString();
    }
    return u.toString();
  } catch {
    return s;
  }
}

/** Old store hosts that still appear in DB absolute URLs after VPS cutover. */
const LEGACY_MEDIA_HOSTS = new Set([
  "sialkotmotorsports.com",
  "www.sialkotmotorsports.com",
]);

/** Remap legacy absolute /media|/uploads URLs onto the configured public origin. */
function rewriteLegacyMediaHost(urlString) {
  const s = String(urlString || "").trim();
  if (!s) return s;
  try {
    const u = new URL(s);
    if (!LEGACY_MEDIA_HOSTS.has(u.hostname.toLowerCase())) return s;
    const path = u.pathname || "";
    if (!/^\/(media|uploads)\b/i.test(path)) return s;
    const origin = siteOrigin();
    if (!origin) {
      u.hostname = "crazzycars.pk";
      u.protocol = "https:";
      return u.toString();
    }
    return preferHttps(new URL(`${path}${u.search || ""}`, `${origin}/`).toString());
  } catch {
    return s;
  }
}

/**
 * @param {unknown} input string URL, media object `{ url }`, or empty
 * @returns {string} absolute URL (https for public hosts) or ""
 */
export function absoluteMediaUrl(input) {
  let raw = input;
  if (raw && typeof raw === "object" && "url" in raw) {
    raw = raw.url;
  }
  let s = String(raw ?? "").trim();
  if (!s) return "";

  if (s.startsWith("//")) {
    s = `https:${s}`;
  }

  if (/^https:\/\//i.test(s)) return rewriteLegacyMediaHost(s);
  if (/^http:\/\//i.test(s)) return rewriteLegacyMediaHost(preferHttps(s));

  // Relative site path
  if (s.startsWith("/")) {
    const origin = siteOrigin();
    if (!origin) return s;
    try {
      return preferHttps(new URL(s, `${origin}/`).toString());
    } catch {
      return preferHttps(`${origin}${s}`);
    }
  }

  // Bare path like "media/foo.jpg"
  if (/^(media|uploads)\//i.test(s)) {
    const origin = siteOrigin();
    if (!origin) return `/${s}`;
    return preferHttps(`${origin}/${s.replace(/^\/+/, "")}`);
  }

  // Leave cloudinary public ids / other opaque strings unchanged (client cloudinaryUrl handles them)
  return s;
}

/** Map an array of image URL strings or `{ url }` objects. */
export function absoluteMediaUrlList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => absoluteMediaUrl(entry)).filter(Boolean);
}
