/**
 * Resolve visitor city / country from request headers (Vercel geo + fallbacks).
 */
export function countryNameFromCode(code) {
  const cc = String(code || "").trim().toUpperCase();
  if (!cc || cc.length !== 2) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc;
  } catch {
    return cc;
  }
}

function decodeHeader(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  } catch {
    return raw;
  }
}

/**
 * @param {Request} request
 * @returns {{ city: string, region: string, countryCode: string, country: string }}
 */
export function geoFromRequest(request) {
  const h = request.headers;
  const city =
    decodeHeader(h.get("x-vercel-ip-city")) ||
    decodeHeader(h.get("cf-ipcity")) ||
    decodeHeader(h.get("x-city")) ||
    "";
  const region =
    decodeHeader(h.get("x-vercel-ip-country-region")) ||
    decodeHeader(h.get("x-region")) ||
    "";
  const countryCode = String(
    h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country-code") || ""
  )
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const country =
    decodeHeader(h.get("x-country-name")) || countryNameFromCode(countryCode) || countryCode;

  return { city, region, countryCode, country };
}
