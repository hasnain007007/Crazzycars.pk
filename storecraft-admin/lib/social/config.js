/**
 * Social Auto-Poster env config.
 * Never log secrets. Missing Meta creds → schedulerDisabled warning (do not crash).
 */

const TRUE = new Set(["1", "true", "yes", "on"]);

function envBool(key, fallback = false) {
  const raw = process.env[key];
  if (raw == null || String(raw).trim() === "") return fallback;
  return TRUE.has(String(raw).trim().toLowerCase());
}

function envStr(key, fallback = "") {
  const v = String(process.env[key] || "").trim();
  return v || fallback;
}

/** Public storefront origin used for Instagram/TikTok image URLs. */
export function getSocialPublicBaseUrl() {
  return envStr(
    "PUBLIC_BASE_URL",
    envStr(
      "MEDIA_PUBLIC_BASE_URL",
      envStr("NEXT_PUBLIC_STORE_URL", "https://crazzycars.pk")
    )
  ).replace(/\/$/, "");
}

/**
 * Folder under MEDIA_ROOT for social images.
 * Spec SOCIAL_MEDIA_DIR=uploads/social → we use "social" on the shared volume
 * so public URLs are {PUBLIC_BASE_URL}/media/social/<postId>/n.jpg
 */
export function getSocialMediaFolder() {
  const raw = envStr("SOCIAL_MEDIA_DIR", "social");
  // Strip leading uploads/ if present — MEDIA_ROOT already is the media root.
  return raw
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9/_-]/gi, "") || "social";
}

export function parseDefaultSlots(raw) {
  const src = String(raw || "10:00,18:00");
  return src
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{1,2}:\d{2}$/.test(s));
}

/**
 * @returns {{
 *   enabled: boolean,
 *   dryRun: boolean,
 *   timezone: string,
 *   defaultSlots: string[],
 *   graphVersion: string,
 *   pageId: string,
 *   igUserId: string,
 *   pageToken: string,
 *   publicBaseUrl: string,
 *   mediaFolder: string,
 *   tiktokMode: 'off'|'metricool'|'tiktok_api',
 *   alertEmail: string,
 *   metaReady: boolean,
 *   schedulerDisabled: boolean,
 *   warnings: string[],
 * }}
 */
export function getSocialConfig() {
  const warnings = [];
  const enabled = envBool("SOCIAL_ENABLED", false);
  const dryRun = envBool("SOCIAL_DRY_RUN", true);
  const timezone = envStr("SOCIAL_TIMEZONE", "Asia/Karachi");
  const defaultSlots = parseDefaultSlots(envStr("SOCIAL_DEFAULT_SLOTS", "10:00,18:00"));
  const graphVersion = envStr("META_GRAPH_VERSION", "v23.0");
  const pageId = envStr("META_PAGE_ID");
  const igUserId = envStr("META_IG_USER_ID");
  const pageToken = envStr("META_PAGE_TOKEN");
  const publicBaseUrl = getSocialPublicBaseUrl();
  const mediaFolder = getSocialMediaFolder();
  const tiktokModeRaw = envStr("TIKTOK_MODE", "off").toLowerCase();
  const tiktokMode = ["off", "metricool", "tiktok_api"].includes(tiktokModeRaw)
    ? tiktokModeRaw
    : "off";
  const alertEmail = envStr("SOCIAL_ALERT_EMAIL");

  const tokenLooksPlaceholder =
    !pageToken ||
    /paste|placeholder|changeme|__|xxx/i.test(pageToken) ||
    pageToken.length < 20;

  if (enabled && !pageId) warnings.push("META_PAGE_ID missing");
  if (enabled && !igUserId) warnings.push("META_IG_USER_ID missing");
  if (enabled && tokenLooksPlaceholder) warnings.push("META_PAGE_TOKEN missing or placeholder");

  const metaReady = Boolean(pageId && igUserId && !tokenLooksPlaceholder);
  const schedulerDisabled = !enabled || (!dryRun && !metaReady);

  if (enabled && schedulerDisabled && !dryRun) {
    warnings.push(
      "Social scheduler disabled until META_PAGE_ID, META_IG_USER_ID, and META_PAGE_TOKEN are set."
    );
  }

  return {
    enabled,
    dryRun,
    timezone,
    defaultSlots: defaultSlots.length ? defaultSlots : ["10:00", "18:00"],
    graphVersion,
    pageId,
    igUserId,
    pageToken: metaReady ? pageToken : "",
    publicBaseUrl,
    mediaFolder,
    tiktokMode,
    alertEmail,
    metaReady,
    schedulerDisabled,
    warnings,
  };
}

/** Safe snapshot for admin health UI (no token). */
export function getSocialConfigPublic() {
  const c = getSocialConfig();
  return {
    enabled: c.enabled,
    dryRun: c.dryRun,
    timezone: c.timezone,
    defaultSlots: c.defaultSlots,
    graphVersion: c.graphVersion,
    pageId: c.pageId ? `${c.pageId.slice(0, 4)}…` : "",
    igUserId: c.igUserId ? `${c.igUserId.slice(0, 6)}…` : "",
    hasPageToken: Boolean(c.pageToken),
    publicBaseUrl: c.publicBaseUrl,
    mediaFolder: c.mediaFolder,
    tiktokMode: c.tiktokMode,
    alertEmail: c.alertEmail ? "(set)" : "",
    metaReady: c.metaReady,
    schedulerDisabled: c.schedulerDisabled,
    warnings: c.warnings,
  };
}

let didWarn = false;
export function warnSocialConfigOnce() {
  if (didWarn) return;
  didWarn = true;
  const c = getSocialConfig();
  if (!c.enabled) return;
  for (const w of c.warnings) {
    console.warn(`[social-autoposter] ${w}`);
  }
}
