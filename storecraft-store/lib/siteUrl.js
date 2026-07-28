/**
 * Public storefront origin resolution.
 *
 * Priority (server / discovery routes):
 * 1. Incoming request Host (so *.vercel.app works now; custom domain works later with zero edits)
 * 2. NEXT_PUBLIC_SITE_URL / SITE_URL / NEXT_PUBLIC_STORE_URL
 * 3. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL
 * 4. Aspirational default (custom domain) — only if nothing else is available
 *
 * When crazzycars.pk is attached to this Vercel project, request Host becomes that domain
 * automatically — no code change. Optionally set NEXT_PUBLIC_SITE_URL=https://crazzycars.pk
 * for client-side absolute URLs / canonicals.
 */
const DEFAULT_SITE_URL = "https://crazzycars.pk";

function cleanUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function withHttps(hostOrUrl) {
  const raw = cleanUrl(hostOrUrl);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

/** Env / platform fallbacks (no request context). */
export function getConfiguredSiteUrl() {
  return (
    cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanUrl(process.env.SITE_URL) ||
    cleanUrl(process.env.NEXT_PUBLIC_STORE_URL) ||
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    withHttps(process.env.VERCEL_URL) ||
    DEFAULT_SITE_URL
  );
}

/**
 * @param {{ headers?: Headers | { get: (name: string) => string | null } } | null} [opts]
 */
export function getSiteUrl(opts = null) {
  try {
    const h = opts?.headers;
    if (h && typeof h.get === "function") {
      const host = cleanUrl(h.get("x-forwarded-host") || h.get("host"));
      // Ignore localhost hosts for absolute public links in discovery files.
      if (host && !/^localhost\b/i.test(host) && !/^127\.0\.0\.1\b/.test(host)) {
        const proto = cleanUrl(h.get("x-forwarded-proto")) || "https";
        return `${proto}://${host}`.replace(/\/+$/, "");
      }
    }
  } catch {
    /* fall through */
  }
  return getConfiguredSiteUrl();
}

export function absoluteUrl(path = "/", opts = null) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, `${getSiteUrl(opts)}/`).toString();
}

/**
 * Indexing gate for launch.
 * - Set NEXT_PUBLIC_INDEXABLE=true only when you want search engines to index.
 * - Preview / staging / local stay noindex unless that flag is explicitly true
 *   AND the site URL is not a *.vercel.app host (custom domain preferred for Google).
 */
export function isIndexableEnvironment(opts = null) {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true") return false;
  try {
    if (new URL(getSiteUrl(opts)).hostname.endsWith(".vercel.app")) return false;
  } catch {
    return false;
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  return true;
}

/**
 * Reject leftover foreign canonicals from old template DB settings.
 * Any host that is not the configured site host is rewritten to the active site URL.
 */
export function sanitizeCanonicalUrl(candidate, opts = null) {
  const site = getSiteUrl(opts);
  const raw = String(candidate || "").trim();
  if (!raw) return site;
  try {
    const u = new URL(raw, `${site}/`);
    const siteHost = new URL(site).hostname.replace(/^www\./, "").toLowerCase();
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== siteHost) {
      const path = u.pathname === "/" ? "" : u.pathname;
      return `${site}${path}${u.search || ""}`.replace(/\/$/, "") || site;
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return site;
  }
}
