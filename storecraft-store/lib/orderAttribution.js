/**
 * Multi-channel order attribution (first-touch + last-non-direct).
 *
 * Captures UTM / click-ids / referrer / landing path into cookies, then stamps
 * the resolved Origin onto the Order at checkout so ops can see where sales
 * came from (Organic: Google, Direct, Source: Chatgpt.com, Paid: Meta, …).
 *
 * Honest limits (same class as Shopify / GA):
 * - Cross-device and cookie clears break the chain
 * - In-app browsers often drop Referer
 * - Meta/Instagram vs Meta AI is intentionally separated (ambiguous hosts)
 */
import { classifyAiTraffic } from "@/lib/aiAgentTraffic";

export const ATTR_FT_COOKIE = "cc_attr_ft";
export const ATTR_LT_COOKIE = "cc_attr_lt";
export const ATTR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const ATTR_WINDOW_DAYS = 30;

const OWN_HOSTS = new Set([
  "crazzycars.pk",
  "www.crazzycars.pk",
  "localhost",
  "127.0.0.1",
]);

const SEARCH_HOSTS = [
  { key: "google", hosts: ["google.com", "google.com.pk", "google.co.uk"], label: "Organic: Google" },
  { key: "bing", hosts: ["bing.com"], label: "Organic: Bing" },
  { key: "yahoo", hosts: ["yahoo.com", "search.yahoo.com"], label: "Organic: Yahoo" },
  { key: "duckduckgo", hosts: ["duckduckgo.com"], label: "Organic: DuckDuckGo" },
  { key: "yandex", hosts: ["yandex.com", "yandex.ru"], label: "Organic: Yandex" },
];

const SOCIAL_HOSTS = [
  { key: "facebook", hosts: ["facebook.com", "fb.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com"], label: "Social: Facebook" },
  { key: "instagram", hosts: ["instagram.com", "l.instagram.com"], label: "Social: Instagram" },
  { key: "tiktok", hosts: ["tiktok.com"], label: "Social: TikTok" },
  { key: "youtube", hosts: ["youtube.com", "youtu.be", "m.youtube.com"], label: "Social: YouTube" },
  { key: "twitter", hosts: ["twitter.com", "x.com", "t.co"], label: "Social: X" },
  { key: "whatsapp", hosts: ["whatsapp.com", "wa.me", "api.whatsapp.com"], label: "WhatsApp" },
];

const META_UTM = new Set(["facebook", "fb", "fbads", "meta", "instagram", "ig", "an", "igads"]);

const AI_LABELS = {
  chatgpt: "Source: Chatgpt.com",
  copilot: "Source: Copilot",
  perplexity: "Source: Perplexity.ai",
  claude: "Source: Claude.ai",
  gemini: "Source: Gemini",
  grok: "Source: Grok",
  meta: "Source: Meta.ai",
  deepseek: "Source: DeepSeek",
  you: "Source: You.com",
  google_extended: "AI: Google-Extended",
  bing: "AI: Bingbot",
  apple: "AI: Applebot",
  amazon: "AI: Amazonbot",
  bytespider: "AI: Bytespider",
  other_ai: "AI: Other",
};

function cookieOpts(request) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ATTR_WINDOW_MS / 1000),
    secure:
      request?.nextUrl?.protocol === "https:" || process.env.NODE_ENV === "production",
  };
}

function normalizeHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function hostFromUrl(raw) {
  try {
    return normalizeHost(new URL(String(raw || "")).hostname);
  } catch {
    return "";
  }
}

function hostMatches(host, ruleHost) {
  const h = normalizeHost(ruleHost);
  if (!host || !h) return false;
  return host === h || host.endsWith(`.${h}`);
}

function isOwnHost(host) {
  if (!host) return false;
  if (OWN_HOSTS.has(host)) return true;
  return host.endsWith(".crazzycars.pk");
}

function truncate(s, n) {
  return String(s || "").trim().slice(0, n);
}

/** Edge + Node safe base64url (middleware runs on Edge without Buffer). */
function toBase64Url(str) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw) {
  const s = String(raw || "");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(s, "base64url").toString("utf8");
  }
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encodeTouch(touch) {
  try {
    return toBase64Url(JSON.stringify(touch));
  } catch {
    return "";
  }
}

function decodeTouch(raw) {
  try {
    const json = fromBase64Url(String(raw || ""));
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;
    const ts = Number(obj.ts);
    if (!Number.isFinite(ts)) return null;
    if (Date.now() - ts > ATTR_WINDOW_MS) return null;
    if (!obj.ch || !obj.lb) return null;
    return obj;
  } catch {
    return null;
  }
}

function touchFromParts({
  channel,
  label,
  source = "",
  medium = "",
  campaign = "",
  content = "",
  term = "",
  referrerHost = "",
  landingPath = "/",
  detection = "",
  gclid = false,
  fbclid = false,
  ts = Date.now(),
}) {
  return {
    ch: truncate(channel, 40),
    lb: truncate(label, 80),
    src: truncate(source, 80),
    med: truncate(medium, 80),
    cmp: truncate(campaign, 120),
    cnt: truncate(content, 80),
    trm: truncate(term, 80),
    rh: truncate(referrerHost, 120),
    lp: truncate(landingPath || "/", 200),
    ts: Number(ts) || Date.now(),
    det: truncate(detection, 20),
    gclid: gclid ? 1 : 0,
    fbclid: fbclid ? 1 : 0,
  };
}

function expandTouch(t) {
  if (!t) return null;
  return {
    channel: t.ch || "",
    label: t.lb || "",
    source: t.src || "",
    medium: t.med || "",
    campaign: t.cmp || "",
    content: t.cnt || "",
    term: t.trm || "",
    referrerHost: t.rh || "",
    landingPath: t.lp || "/",
    detectedAt: t.ts ? new Date(t.ts) : null,
    detection: t.det || "",
    hasGclid: Boolean(t.gclid),
    hasFbclid: Boolean(t.fbclid),
  };
}

/**
 * Classify a single landing hit into a channel touch.
 */
export function classifyLandingHit({
  searchParams,
  referer = "",
  pathname = "/",
  userAgent = "",
  url = null,
} = {}) {
  const params =
    searchParams && typeof searchParams.get === "function"
      ? searchParams
      : new URLSearchParams(searchParams || "");

  const utmSource = truncate(params.get("utm_source"), 80).toLowerCase();
  const utmMedium = truncate(params.get("utm_medium"), 80).toLowerCase();
  const utmCampaign = truncate(params.get("utm_campaign"), 120);
  const utmContent = truncate(params.get("utm_content"), 80);
  const utmTerm = truncate(params.get("utm_term"), 80);
  const hasGclid = params.has("gclid") || Boolean(String(params.get("gclid") || "").trim());
  const hasFbclid = params.has("fbclid") || Boolean(String(params.get("fbclid") || "").trim());
  const refHost = hostFromUrl(referer);
  const landingPath = truncate(pathname || "/", 200);

  const base = {
    campaign: utmCampaign,
    content: utmContent,
    term: utmTerm,
    referrerHost: refHost,
    landingPath,
    gclid: hasGclid,
    fbclid: hasFbclid,
  };

  // 1) Paid click ids / paid UTM
  if (hasFbclid || META_UTM.has(utmSource)) {
    return touchFromParts({
      ...base,
      channel: "paid_meta",
      label: "Paid: Meta",
      source: utmSource || "meta",
      medium: utmMedium || "paid_social",
      detection: hasFbclid ? "fbclid" : "utm",
    });
  }
  if (hasGclid || utmSource === "google" || utmSource === "googleads" || utmSource === "adwords") {
    const paidMedium =
      utmMedium === "cpc" ||
      utmMedium === "ppc" ||
      utmMedium === "paid" ||
      hasGclid ||
      utmSource === "googleads" ||
      utmSource === "adwords";
    if (paidMedium || hasGclid) {
      return touchFromParts({
        ...base,
        channel: "paid_google",
        label: "Paid: Google Ads",
        source: utmSource || "google",
        medium: utmMedium || "cpc",
        detection: hasGclid ? "gclid" : "utm",
      });
    }
  }
  if (
    utmMedium === "cpc" ||
    utmMedium === "ppc" ||
    utmMedium === "paid" ||
    utmMedium === "paid_social" ||
    utmMedium === "paidsocial"
  ) {
    return touchFromParts({
      ...base,
      channel: "paid_other",
      label: "Paid: Ads",
      source: utmSource || "paid",
      medium: utmMedium || "cpc",
      detection: "utm",
    });
  }

  // 2) AI chat / share links
  const aiHit = classifyAiTraffic({
    userAgent,
    referrer: referer,
    url: url || (pathname ? `https://crazzycars.pk${pathname}` : null),
  });
  if (aiHit?.matched && (aiHit.detection === "referrer" || aiHit.detection === "utm")) {
    const src = aiHit.source;
    return touchFromParts({
      ...base,
      channel: `ai_${src}`,
      label: AI_LABELS[src] || `AI: ${src}`,
      source: src,
      medium: "ai",
      referrerHost: refHost || hostFromUrl(aiHit.referrer) || src,
      detection: aiHit.detection,
    });
  }

  // 3) Explicit UTM channels
  if (utmSource || utmMedium) {
    if (utmMedium === "email" || utmSource === "email" || utmSource === "newsletter") {
      return touchFromParts({
        ...base,
        channel: "email",
        label: "Email",
        source: utmSource || "email",
        medium: utmMedium || "email",
        detection: "utm",
      });
    }
    if (utmMedium === "sms" || utmSource === "sms") {
      return touchFromParts({
        ...base,
        channel: "sms",
        label: "SMS",
        source: utmSource || "sms",
        medium: utmMedium || "sms",
        detection: "utm",
      });
    }
    if (
      utmMedium === "social" ||
      META_UTM.has(utmSource) ||
      ["tiktok", "youtube", "twitter", "x"].includes(utmSource)
    ) {
      const socialLabel =
        utmSource === "instagram" || utmSource === "ig"
          ? "Social: Instagram"
          : utmSource === "tiktok"
            ? "Social: TikTok"
            : utmSource === "youtube"
              ? "Social: YouTube"
              : utmSource === "twitter" || utmSource === "x"
                ? "Social: X"
                : "Social: Facebook";
      return touchFromParts({
        ...base,
        channel: "social_utm",
        label: socialLabel,
        source: utmSource || "social",
        medium: utmMedium || "social",
        detection: "utm",
      });
    }
    if (utmMedium === "organic" || utmMedium === "seo") {
      const engine = SEARCH_HOSTS.find((s) => s.key === utmSource) || SEARCH_HOSTS[0];
      return touchFromParts({
        ...base,
        channel: `organic_${engine.key}`,
        label: engine.label,
        source: utmSource || engine.key,
        medium: "organic",
        detection: "utm",
      });
    }
    if (utmSource) {
      const pretty = utmSource.replace(/^[a-z]/, (c) => c.toUpperCase());
      return touchFromParts({
        ...base,
        channel: "campaign",
        label: `Campaign: ${pretty}`,
        source: utmSource,
        medium: utmMedium || "campaign",
        detection: "utm",
      });
    }
  }

  // 4) Referrer-based
  if (refHost && !isOwnHost(refHost)) {
    for (const engine of SEARCH_HOSTS) {
      if (engine.hosts.some((h) => hostMatches(refHost, h))) {
        return touchFromParts({
          ...base,
          channel: `organic_${engine.key}`,
          label: engine.label,
          source: engine.key,
          medium: "organic",
          detection: "referrer",
        });
      }
    }
    for (const social of SOCIAL_HOSTS) {
      if (social.hosts.some((h) => hostMatches(refHost, h))) {
        return touchFromParts({
          ...base,
          channel: `social_${social.key}`,
          label: social.label,
          source: social.key,
          medium: "social",
          detection: "referrer",
        });
      }
    }
    const prettyHost = refHost.replace(/^www\./, "");
    return touchFromParts({
      ...base,
      channel: "referral",
      label: `Source: ${prettyHost}`,
      source: prettyHost,
      medium: "referral",
      detection: "referrer",
    });
  }

  // 5) Direct
  return touchFromParts({
    ...base,
    channel: "direct",
    label: "Direct",
    source: "(direct)",
    medium: "(none)",
    detection: "direct",
  });
}

function isDirectTouch(touch) {
  return !touch || touch.ch === "direct";
}

/**
 * Apply first-touch + last-non-direct cookies onto a NextResponse.
 */
export function applyOrderAttributionCookies(request, response) {
  if (!request || !response) return false;

  const pathname = request.nextUrl?.pathname || "/";
  // Skip noisy paths — same spirit as AI visit skip.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/media/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap")
  ) {
    return false;
  }

  const hit = classifyLandingHit({
    searchParams: request.nextUrl.searchParams,
    referer: request.headers.get("referer") || "",
    pathname,
    userAgent: request.headers.get("user-agent") || "",
    url: request.nextUrl,
  });

  const opts = cookieOpts(request);
  const existingFt = decodeTouch(request.cookies.get(ATTR_FT_COOKIE)?.value);
  const existingLt = decodeTouch(request.cookies.get(ATTR_LT_COOKIE)?.value);

  let wrote = false;

  // First-touch: keep if still in window
  if (!existingFt) {
    const encoded = encodeTouch(hit);
    if (encoded) {
      response.cookies.set(ATTR_FT_COOKIE, encoded, opts);
      wrote = true;
    }
  }

  // Last-non-direct: update on non-direct hits; seed Direct only if empty
  if (!isDirectTouch(hit)) {
    const encoded = encodeTouch(hit);
    if (encoded) {
      response.cookies.set(ATTR_LT_COOKIE, encoded, opts);
      wrote = true;
    }
  } else if (!existingLt) {
    const encoded = encodeTouch(hit);
    if (encoded) {
      response.cookies.set(ATTR_LT_COOKIE, encoded, opts);
      wrote = true;
    }
  }

  return wrote;
}

/**
 * Read attribution from request cookies for checkout stamping.
 */
export function readOrderAttributionFromRequest(request) {
  const ft = expandTouch(decodeTouch(request.cookies.get(ATTR_FT_COOKIE)?.value));
  const lt = expandTouch(decodeTouch(request.cookies.get(ATTR_LT_COOKIE)?.value));

  // Preferred display origin: last non-direct, else first-touch, else Direct
  const primary = (!lt || lt.channel === "direct") && ft && ft.channel !== "direct" ? ft : lt || ft;

  if (!primary) {
    return {
      firstTouch: null,
      lastTouch: null,
      channel: "direct",
      label: "Direct",
      source: "(direct)",
      medium: "(none)",
      campaign: "",
      referrerHost: "",
      landingPath: "/",
    };
  }

  return {
    firstTouch: ft,
    lastTouch: lt,
    channel: primary.channel || "direct",
    label: primary.label || "Direct",
    source: primary.source || "",
    medium: primary.medium || "",
    campaign: primary.campaign || "",
    referrerHost: primary.referrerHost || "",
    landingPath: primary.landingPath || "/",
  };
}

/** Compact Mongo subdoc for Order.attribution */
export function attributionForOrderDoc(attr) {
  if (!attr) return null;
  const mapTouch = (t) =>
    t
      ? {
          channel: t.channel || "",
          label: t.label || "",
          source: t.source || "",
          medium: t.medium || "",
          campaign: t.campaign || "",
          content: t.content || "",
          term: t.term || "",
          referrerHost: t.referrerHost || "",
          landingPath: t.landingPath || "",
          detectedAt: t.detectedAt || null,
          detection: t.detection || "",
          hasGclid: Boolean(t.hasGclid),
          hasFbclid: Boolean(t.hasFbclid),
        }
      : null;

  return {
    channel: attr.channel || "direct",
    label: attr.label || "Direct",
    source: attr.source || "",
    medium: attr.medium || "",
    campaign: attr.campaign || "",
    referrerHost: attr.referrerHost || "",
    landingPath: attr.landingPath || "",
    firstTouch: mapTouch(attr.firstTouch),
    lastTouch: mapTouch(attr.lastTouch),
  };
}

/** AI enum field back-compat from channel key `ai_chatgpt` → `chatgpt`. */
export function aiSourceFromAttribution(attr) {
  const ch = String(attr?.channel || "");
  if (!ch.startsWith("ai_")) return "";
  return ch.slice(3);
}
