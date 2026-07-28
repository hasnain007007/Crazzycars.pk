/**
 * First-touch AI referrer attribution (14-day window).
 *
 * Cookies are set when a human arrives with an AI chat Referer.
 * Crawler UAs are logged as visits but do not set shopper attribution cookies.
 *
 * Honest limits: loses accuracy across devices, cookie clears, and purchases
 * after the window — same class of imperfection as typical e-commerce attribution.
 */

import { AI_SOURCES } from "@/lib/aiAgentTraffic";

export const AI_ATTR_SOURCE_COOKIE = "ai_source";
export const AI_ATTR_FIRST_TOUCH_COOKIE = "ai_first_touch_at";
/** 14 days — within the common 1–30 day e-commerce attribution window. */
export const AI_ATTRIBUTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const AI_ATTRIBUTION_WINDOW_DAYS = 14;

const SOURCE_SET = new Set(AI_SOURCES);

export function isAllowedAiSource(source) {
  return SOURCE_SET.has(String(source || "").trim());
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(AI_ATTRIBUTION_WINDOW_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * First-touch: keep existing cookies if still inside the 14-day window.
 * @returns {boolean} whether cookies should be (re)written
 */
export function shouldWriteAiAttributionCookies(request) {
  const source = String(request.cookies.get(AI_ATTR_SOURCE_COOKIE)?.value || "").trim();
  const tsRaw = request.cookies.get(AI_ATTR_FIRST_TOUCH_COOKIE)?.value;
  const ts = Number(tsRaw);
  if (!isAllowedAiSource(source) || !Number.isFinite(ts)) return true;
  if (Date.now() - ts > AI_ATTRIBUTION_WINDOW_MS) return true;
  return false;
}

/**
 * Set first-touch cookies on a NextResponse when detection is a human AI referrer.
 */
export function applyAiAttributionCookies(request, response, hit) {
  if (!hit?.matched || hit.detection !== "referrer") return false;
  if (!isAllowedAiSource(hit.source)) return false;
  if (!shouldWriteAiAttributionCookies(request)) return false;

  const opts = cookieOptions();
  const now = String(Date.now());
  response.cookies.set(AI_ATTR_SOURCE_COOKIE, hit.source, opts);
  response.cookies.set(AI_ATTR_FIRST_TOUCH_COOKIE, now, opts);
  return true;
}

/**
 * Read valid in-window attribution from an incoming request (checkout).
 * @returns {{ source: string, firstTouchAt: Date } | null}
 */
export function readAiAttributionFromRequest(request) {
  const source = String(request.cookies.get(AI_ATTR_SOURCE_COOKIE)?.value || "").trim();
  const ts = Number(request.cookies.get(AI_ATTR_FIRST_TOUCH_COOKIE)?.value);
  if (!isAllowedAiSource(source) || !Number.isFinite(ts)) return null;
  if (Date.now() - ts > AI_ATTRIBUTION_WINDOW_MS) return null;
  return { source, firstTouchAt: new Date(ts) };
}
