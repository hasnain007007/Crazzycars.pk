import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  STORE_JWT_COOKIE_NAME,
  STORE_JWT_COOKIE_NAME_LEGACY,
} from "@/lib/constants";
import { classifyAiTraffic, shouldSkipAiVisitPath } from "@/lib/aiAgentTraffic";
import { applyAiAttributionCookies } from "@/lib/aiAttribution";
import { AI_INGEST_INTERNAL_TOKEN } from "@/lib/aiIngestInternal";

function redirectPath(request, pathname, status = 308) {
  // Prefer `new URL` over NextURL.clone() so Location never inherits stale search.
  const dest = new URL(pathname, request.nextUrl.origin);
  const kept = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    const lower = String(key).toLowerCase();
    if (STRIP_QUERY_KEYS.has(lower) || lower.startsWith("utm_")) continue;
    kept.append(key, value);
  }
  const qs = kept.toString();
  if (qs) dest.search = qs;
  return NextResponse.redirect(dest, status);
}

/** Query keys Google still crawls from the old Shopify store. */
const STRIP_QUERY_KEYS = new Set([
  "variant",
  "country",
  "currency",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "_pos",
  "_fid",
  "_ss",
  "_v",
  "pb",
]);

/**
 * - Fix Shopify-era / Google-indexed URLs (collections, case, cart, search).
 * - Log AI crawler / AI-referrer traffic (non-blocking).
 * - Tag first-touch AI-referrer attribution cookies (14-day window).
 * - Protect storefront account pages (login/register excluded via path checks).
 */
function wwwToApexRedirect(request) {
  const raw = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!raw.startsWith("www.")) return null;
  const apex = raw.slice(4).split(":")[0];
  if (!apex || apex.startsWith("localhost") || apex.startsWith("127.")) return null;
  const dest = new URL(`https://${apex}${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(dest, 308);
}

export async function middleware(request) {
  const wwwRedirect = wwwToApexRedirect(request);
  if (wwwRedirect) return wwwRedirect;

  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase();

  // Linux hosts are case-sensitive — Google indexes /Categories/Exterior etc.
  if (pathname !== lower) {
    const caseSensitivePrefixes = [
      "/categories",
      "/collections",
      "/products",
      "/pages",
      "/blogs",
      "/cars",
      "/shop",
      "/sale",
      "/about",
      "/contact",
      "/faq",
      "/cart",
      "/search",
      "/account",
      "/checkout",
      "/track-order",
    ];
    if (caseSensitivePrefixes.some((p) => lower === p || lower.startsWith(`${p}/`))) {
      return redirectPath(request, lower, 308);
    }
  }

  // Shopify singular /collection/:handle
  if (lower.startsWith("/collection/") && !lower.startsWith("/collections/")) {
    return redirectPath(request, `/collections/${lower.slice("/collection/".length)}`, 308);
  }

  // Shopify blog home
  if (lower === "/blogs/news" || lower === "/blog/news") {
    return redirectPath(request, "/blogs", 308);
  }

  // Duplicate catalog index — /shop is canonical. /products/:handle still 308s below.
  if (lower.replace(/\/+$/, "") === "/products") {
    return redirectPath(request, "/shop", 308);
  }

  // Shopify-era product URLs (+ variant/country/currency) → clean /[slug] in one hop.
  // Use `new URL` — NextURL.clone() + search="" often keeps the old query string.
  if (lower.startsWith("/products/")) {
    const rest = lower.slice("/products/".length).replace(/\/+$/, "");
    if (rest && !rest.includes("/")) {
      return NextResponse.redirect(new URL(`/${rest}`, request.nextUrl.origin), 308);
    }
  }

  // Self-canonicalizing: strip leftover Shopify/tracking params on any other URL.
  {
    const kept = new URLSearchParams();
    let changed = false;
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      const k = String(key).toLowerCase();
      if (STRIP_QUERY_KEYS.has(k) || k.startsWith("utm_")) {
        changed = true;
        continue;
      }
      kept.append(key, value);
    }
    if (changed) {
      const dest = new URL(request.nextUrl.pathname, request.nextUrl.origin);
      const qs = kept.toString();
      if (qs) dest.search = qs;
      return NextResponse.redirect(dest, 308);
    }
  }

  const isAccountProtected =
    pathname.startsWith("/account/") &&
    !pathname.startsWith("/account/login") &&
    !pathname.startsWith("/account/register") &&
    !pathname.startsWith("/account/forgot-password") &&
    !pathname.startsWith("/account/reset-password");

  let response = NextResponse.next();
  let aiHit = null;

  if (!shouldSkipAiVisitPath(pathname)) {
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    aiHit = classifyAiTraffic({ userAgent, referrer });
    if (aiHit?.matched) {
      // Loopback avoids Traefik; internal token works in Edge without runtime secrets.
      const port = process.env.PORT || "3000";
      const ingestUrl = `http://127.0.0.1:${port}/api/analytics/ai-visit`;
      const secret =
        process.env.AI_VISIT_INGEST_SECRET ||
        process.env.REVALIDATE_SECRET ||
        process.env.CRON_SECRET ||
        "";
      const headers = {
        "content-type": "application/json",
        "x-internal-ai-ingest": AI_INGEST_INTERNAL_TOKEN,
      };
      if (secret) headers["x-ai-visit-secret"] = secret;
      fetch(ingestUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          path: pathname,
          source: aiHit.source,
          detection: aiHit.detection,
          userAgent: aiHit.userAgent,
          referrer: aiHit.referrer,
          referrerQuery: aiHit.referrerQuery,
          method: request.method,
        }),
      }).catch(() => {});
    }
  }

  if (isAccountProtected) {
    const token =
      request.cookies.get(STORE_JWT_COOKIE_NAME)?.value ||
      request.cookies.get(STORE_JWT_COOKIE_NAME_LEGACY)?.value ||
      request.cookies.get("sialkot_store_token")?.value ||
      request.cookies.get("sialkot_store_token_legacy")?.value;
    if (!token) {
      response = NextResponse.redirect(new URL("/account/login", request.url));
    } else {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        response = NextResponse.redirect(new URL("/account/login", request.url));
      } else {
        try {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
          if (payload?.type !== "store_customer" || !payload?.sub) {
            response = NextResponse.redirect(new URL("/account/login", request.url));
          }
        } catch {
          response = NextResponse.redirect(new URL("/account/login", request.url));
        }
      }
    }
  }

  if (aiHit) {
    applyAiAttributionCookies(request, response, aiHit);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets / Next internals / liveness probe.
     * Includes public pages (for AI logging) and /account/* (for auth).
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
