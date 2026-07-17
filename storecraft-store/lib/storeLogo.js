export const DEFAULT_STORE_LOGO_URL = "";

/** Trim surrounding empty space from Cloudinary-hosted logos so they fill their box. */
export function trimmedLogoUrl(url) {
  const u = String(url || "");
  if (!u.includes("res.cloudinary.com") || !u.includes("/upload/") || u.includes("e_trim")) return u;
  return u.replace("/upload/", "/upload/e_trim/");
}

/** Resolve logo URL from public settings (logoUrl string, legacy logo object, or default). */
export function resolveStoreLogoUrl(settings) {
  if (!settings || typeof settings !== "object") return DEFAULT_STORE_LOGO_URL;

  const g = settings.general || {};
  const candidates = [
    typeof g.logoUrl === "string" ? g.logoUrl.trim() : "",
    typeof settings.logoUrl === "string" ? settings.logoUrl.trim() : "",
    typeof g.logo === "string" ? g.logo.trim() : "",
    g.logo && typeof g.logo === "object" && typeof g.logo.url === "string" ? g.logo.url.trim() : "",
  ];

  for (const url of candidates) {
    if (url) return url;
  }

  return DEFAULT_STORE_LOGO_URL;
}
