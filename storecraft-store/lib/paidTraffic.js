/** Cookie set on the first hop so a later 308 that strips fbclid/utm still knows this was paid. */
export const PAID_TRAFFIC_COOKIE = "cc_paid";
export const PAID_TRAFFIC_MAX_AGE = 30 * 60;

const META_UTM = new Set([
  "facebook",
  "fb",
  "fbads",
  "meta",
  "instagram",
  "ig",
  "an",
  "igads",
]);

const META_REFERER_RE =
  /(?:^|[/.])(?:facebook|instagram|fb\.com|l\.facebook|lm\.facebook|m\.facebook|l\.instagram)\./i;

/**
 * Detect paid / social landing from the inbound request (query + Referer).
 * Returns a short source tag or "".
 */
export function detectPaidSocialSource({ searchParams, referer, cookieValue } = {}) {
  const existing = String(cookieValue || "").trim().toLowerCase();
  if (existing === "meta" || existing === "google" || existing === "paid") return existing;

  const params =
    searchParams && typeof searchParams.get === "function"
      ? searchParams
      : new URLSearchParams(searchParams || "");
  const utm = String(params.get("utm_source") || "").trim().toLowerCase();
  const medium = String(params.get("utm_medium") || "").trim().toLowerCase();
  const campaign = String(params.get("utm_campaign") || "").trim().toLowerCase();
  const ref = String(referer || "");

  if (params.has("fbclid") || META_UTM.has(utm) || META_REFERER_RE.test(ref)) {
    return "meta";
  }
  if (params.has("gclid") || utm === "google" || utm === "googleads") {
    return "google";
  }
  if (
    medium === "cpc" ||
    medium === "ppc" ||
    medium === "paid" ||
    medium === "paid_social" ||
    medium === "paidsocial" ||
    utm === "cpc" ||
    campaign.includes("ads")
  ) {
    return "paid";
  }
  return "";
}

export function refererHost(referer) {
  try {
    return new URL(String(referer || "")).host || "";
  } catch {
    return "";
  }
}

/**
 * Structured Coolify-log line for 404s that arrived from paid/social.
 * Does not log click ids (fbclid/gclid) — only that they were present.
 */
export function logPaidMissingPage({
  path,
  kind = "404",
  source,
  referer,
  hasFbclid,
  utmSource,
} = {}) {
  if (!source) return;
  const payload = {
    event: "paid_missing_page",
    kind,
    path: String(path || "").slice(0, 300),
    source,
    refererHost: refererHost(referer),
    hasFbclid: Boolean(hasFbclid),
    utmSource: String(utmSource || "").slice(0, 80),
  };
  console.warn("[paid-404]", JSON.stringify(payload));
}
