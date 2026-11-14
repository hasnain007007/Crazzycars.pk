/**
 * Where a storefront visit came from, in words the owner reads on the admin dashboard
 * ("Facebook ad", "Google search", "Direct"). Pure — used by /api/presence.
 */

const NAMED_SOURCES = [
  [/^(facebook|fb|meta)$/i, "Facebook"],
  [/^(instagram|ig)$/i, "Instagram"],
  [/^google$/i, "Google"],
  [/^(tiktok|tt)$/i, "TikTok"],
  [/^(whatsapp|wa)$/i, "WhatsApp"],
  [/^(youtube|yt)$/i, "YouTube"],
  [/^snapchat$/i, "Snapchat"],
];

/** cc_paid cookie values (lib/paidTraffic.js) → label. */
const PAID_COOKIE_SOURCES = {
  meta: "Facebook / Instagram",
  google: "Google ad",
  snapchat: "Snapchat",
  paid: "Paid ad",
};

const REFERRER_HOSTS = [
  [/(^|\.)google\./i, "Google search"],
  [/(^|\.)bing\.com$/i, "Bing search"],
  [/(^|\.)duckduckgo\.com$/i, "DuckDuckGo"],
  [/(^|\.)yahoo\.com$/i, "Yahoo search"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/i, "Facebook"],
  [/(^|\.)instagram\.com$/i, "Instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "YouTube"],
  [/(^|\.)tiktok\.com$/i, "TikTok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/i, "WhatsApp"],
  [/(^|\.)snapchat\.com$/i, "Snapchat"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/i, "ChatGPT"],
];

function hostOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * @param {{ referrer?: string, search?: string, ownHost?: string, paidCookie?: string }} input
 *   referrer — document.referrer of the first page; search — that page's query string;
 *   paidCookie — the middleware's cc_paid cookie, set before it strips fbclid / utm_* from
 *   the URL (so on the live site `search` is usually empty for ad clicks).
 * @returns {{ source: string, referrerHost: string }}
 */
export function visitSource({ referrer = "", search = "", ownHost = "", paidCookie = "" } = {}) {
  let params;
  try {
    params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  } catch {
    params = new URLSearchParams();
  }
  const own = String(ownHost || "").replace(/^www\./i, "").toLowerCase();
  let referrerHost = hostOf(referrer);
  if (referrerHost && own && (referrerHost === own || referrerHost.endsWith(`.${own}`))) referrerHost = "";

  const paidMedium = /^(cpc|ppc|paid|paid_social|paidsocial|ads?|cpm)$/i.test(params.get("utm_medium") || "");
  const utm = String(params.get("utm_source") || "").trim();
  if (utm) {
    const named = NAMED_SOURCES.find(([re]) => re.test(utm));
    const name = named ? named[1] : utm.slice(0, 40);
    return { source: paidMedium ? `${name} ad` : name, referrerHost };
  }
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid")) return { source: "Google ad", referrerHost };
  if (params.get("fbclid")) {
    const ig = /instagram/i.test(referrerHost);
    return { source: ig ? "Instagram" : "Facebook / Instagram", referrerHost };
  }
  if (params.get("ttclid")) return { source: "TikTok ad", referrerHost };
  const fromCookie = PAID_COOKIE_SOURCES[String(paidCookie || "").trim().toLowerCase()];
  if (fromCookie) return { source: fromCookie, referrerHost };
  if (referrerHost) {
    const known = REFERRER_HOSTS.find(([re]) => re.test(referrerHost));
    return { source: known ? known[1] : referrerHost.slice(0, 60), referrerHost };
  }
  return { source: "Direct", referrerHost: "" };
}

/** True for crawlers / preview fetchers / test browsers that run our JS. */
export function isBotUserAgent(ua) {
  // Not a bare "bot" match: Cubot phones have "CUBOT" in a normal Android UA.
  return /\bbot\b|[a-z]bot\/|compatible;[^)]*(bot|crawl|spider)|crawler|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|meta-externalagent|google-inspectiontool|\bptst\b/i.test(
    String(ua || "")
  );
}
