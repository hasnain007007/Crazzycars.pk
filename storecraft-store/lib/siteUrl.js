const DEFAULT_SITE_URL = "https://crazzycars.pk";

function cleanUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

/** Public storefront origin. Override on Vercel preview via NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl() {
  return (
    cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanUrl(process.env.NEXT_PUBLIC_STORE_URL) ||
    DEFAULT_SITE_URL
  );
}

export function absoluteUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, `${getSiteUrl()}/`).toString();
}

/**
 * Indexing gate for launch.
 * - Set NEXT_PUBLIC_INDEXABLE=true only on the real production domain.
 * - Preview / staging / local stay noindex unless that flag is explicitly true
 *   AND the site URL is not a *.vercel.app host.
 */
export function isIndexableEnvironment() {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true") return false;
  try {
    if (new URL(getSiteUrl()).hostname.endsWith(".vercel.app")) return false;
  } catch {
    return false;
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  return true;
}

const BLOCKED_CANONICAL_HOSTS = new Set([
  "sialkotmotorsports.com",
  "www.sialkotmotorsports.com",
  "sialkotmotorssports.com",
  "www.sialkotmotorssports.com",
]);

/** Reject leftover foreign canonicals from old template DB settings. */
export function sanitizeCanonicalUrl(candidate) {
  const site = getSiteUrl();
  const raw = String(candidate || "").trim();
  if (!raw) return site;
  try {
    const u = new URL(raw, `${site}/`);
    const siteHost = new URL(site).hostname.replace(/^www\./, "").toLowerCase();
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (BLOCKED_CANONICAL_HOSTS.has(u.hostname.toLowerCase()) || BLOCKED_CANONICAL_HOSTS.has(host)) {
      const path = u.pathname === "/" ? "" : u.pathname;
      return `${site}${path}${u.search || ""}`.replace(/\/$/, "") || site;
    }
    if (host !== siteHost) {
      const path = u.pathname === "/" ? "" : u.pathname;
      return `${site}${path}${u.search || ""}`.replace(/\/$/, "") || site;
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return site;
  }
}
