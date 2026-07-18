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
