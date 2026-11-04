/**
 * Public storefront origin for preview links and SEO display in admin.
 * Never use NEXT_PUBLIC_APP_URL here — that is the admin panel URL.
 */

const DEFAULT_STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STORE_URL_FALLBACK || "https://crazzycars.pk";

function normalizeBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

function isAdminOrigin(url) {
  const u = normalizeBase(url).toLowerCase();
  if (!u) return true;
  return (
    u.includes("localhost:3001") ||
    u.includes("storecraft-admin") ||
    u.endsWith("/admin")
  );
}

/** @returns {string} Storefront origin without trailing slash */
export function getStorefrontBaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_STORE_URL,
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.STOREFRONT_ORIGIN,
  ];

  for (const raw of candidates) {
    const base = normalizeBase(raw);
    if (base && !isAdminOrigin(base)) return base;
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return normalizeBase(process.env.NEXT_PUBLIC_STORE_URL) || "http://localhost:3000";
    }
  }

  return DEFAULT_STOREFRONT_URL;
}

/** @param {string} slug */
export function getStorefrontPageUrl(slug) {
  const base = getStorefrontBaseUrl();
  const path = String(slug || "")
    .trim()
    .replace(/^\//, "")
    .replace(/^pages\//, "");
  if (!path) return base;
  return `${base}/pages/${path}`;
}

/** Storefront origin for preview links (never admin APP_URL). */
export function getStoreUrl() {
  return (
    process.env.NEXT_PUBLIC_STORE_URL ||
    getStorefrontBaseUrl()
  );
}

/**
 * Logo URLs for admin chrome (Sidebar / Topbar).
 * Settings often store storefront-relative paths like `/brand/logo-header.webp`
 * which 404 on admin.crazzycars.pk — rewrite those to the storefront origin.
 * Absolute /media URLs on our hosts stay as storefront absolute (img loads cross-origin fine).
 */
export function resolveAdminChromeLogoUrl(logoUrl) {
  const raw = String(logoUrl || "").trim();
  if (!raw) return "";
  const store = getStorefrontBaseUrl();
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      return `${store}${raw}`;
    }
    const u = new URL(raw, store);
    const host = u.hostname.toLowerCase();
    const isOurs =
      host === "crazzycars.pk" ||
      host === "www.crazzycars.pk" ||
      host === "admin.crazzycars.pk" ||
      host.endsWith(".crazzycars.pk") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (isOurs && (u.pathname.startsWith("/brand/") || u.pathname.startsWith("/media/"))) {
      // Prefer storefront for brand static + shared media so admin chrome never 404s.
      if (host === "admin.crazzycars.pk" || host.includes("localhost:3001")) {
        return `${store}${u.pathname}${u.search || ""}`;
      }
    }
    return u.href;
  } catch {
    return raw;
  }
}
