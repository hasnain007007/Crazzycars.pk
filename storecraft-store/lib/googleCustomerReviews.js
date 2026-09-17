/**
 * Google Customer Reviews (Merchant Center) helpers.
 * @see https://support.google.com/merchants/answer/7105162
 */

export const GOOGLE_MERCHANT_ID = Number(
  process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID || "5799889931"
);

/** Map free-text country to ISO 3166-1 alpha-2 for GCR. */
export function toDeliveryCountryCode(country) {
  const raw = String(country || "").trim();
  if (!raw) return "PK";
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const lower = raw.toLowerCase();
  if (lower.includes("pakistan") || lower === "pak") return "PK";
  return "PK";
}

/**
 * Estimated delivery date (YYYY-MM-DD) for the GCR opt-in module.
 * Lahore: +3 days (policy max). Other cities: +7 days nationwide COD.
 */
export function estimatedDeliveryDateISO(order, now = new Date()) {
  const created = order?.createdAt ? new Date(order.createdAt) : now;
  const base = Number.isFinite(created.getTime()) ? created : now;
  const city = String(
    order?.shippingAddress?.city || order?.pricing?.shippingZone || ""
  )
    .trim()
    .toLowerCase();
  const days = city === "lahore" || city.includes("lahore") ? 3 : 7;
  const eta = new Date(base.getTime());
  eta.setDate(eta.getDate() + days);
  const y = eta.getFullYear();
  const m = String(eta.getMonth() + 1).padStart(2, "0");
  const d = String(eta.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Valid 8–14 digit GTINs only (optional GCR products[]). */
export function gtinFromRaw(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 14) return digits;
  return "";
}
