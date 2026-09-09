import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  STORE_JWT_COOKIE_NAME,
  STORE_JWT_COOKIE_NAME_LEGACY,
} from "@/lib/constants";
import { classifyAiTraffic, shouldSkipAiVisitPath } from "@/lib/aiAgentTraffic";
import { applyAiAttributionCookies } from "@/lib/aiAttribution";
import { AI_INGEST_INTERNAL_TOKEN } from "@/lib/aiIngestInternal";
import {
  PAID_TRAFFIC_COOKIE,
  PAID_TRAFFIC_MAX_AGE,
  detectPaidSocialSource,
} from "@/lib/paidTraffic";
import { looksLikeProductSlug, slugFromPathname } from "@/lib/missingProductHelpers";
import { stripBrandSuffix } from "@/lib/productSlugParam";

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
function paidSourceFromRequest(request) {
  return detectPaidSocialSource({
    searchParams: request.nextUrl.searchParams,
    referer: request.headers.get("referer") || "",
    cookieValue: request.cookies.get(PAID_TRAFFIC_COOKIE)?.value || "",
  });
}

function setPaidTrafficCookie(request, response, source) {
  if (!source) return;
  response.cookies.set(PAID_TRAFFIC_COOKIE, source, {
    path: "/",
    maxAge: PAID_TRAFFIC_MAX_AGE,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    httpOnly: true,
  });
}

function withPaidCookie(request, response) {
  setPaidTrafficCookie(request, response, paidSourceFromRequest(request));
  return response;
}

function wwwToApexRedirect(request) {
  const raw = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!raw.startsWith("www.")) return null;
  const apex = raw.slice(4).split(":")[0];
  if (!apex || apex.startsWith("localhost") || apex.startsWith("127.")) return null;
  const dest = new URL(`https://${apex}${request.nextUrl.pathname}${request.nextUrl.search}`);
  return withPaidCookie(request, NextResponse.redirect(dest, 308));
}

export async function middleware(request) {
  const wwwRedirect = wwwToApexRedirect(request);
  if (wwwRedirect) return wwwRedirect;

  const { pathname } = request.nextUrl;

  // Stale Google / CDN HTML still hits /_next/image?url=res.cloudinary.com… —
  // that cloud is billing-disabled (401). Serve a local asset instead.
  if (pathname === "/_next/image" || pathname.startsWith("/_next/image?")) {
    const remote = request.nextUrl.searchParams.get("url") || "";
    let decoded = remote;
    try {
      decoded = decodeURIComponent(remote);
    } catch {
      /* keep raw */
    }
    if (/res\.cloudinary\.com|dquier8fv/i.test(decoded)) {
      return NextResponse.redirect(new URL("/logo.png", request.url), 302);
    }
    return NextResponse.next();
  }

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
      return withPaidCookie(request, redirectPath(request, lower, 308));
    }
  }

  // Shopify singular /collection/:handle
  if (lower.startsWith("/collection/") && !lower.startsWith("/collections/")) {
    return withPaidCookie(
      request,
      redirectPath(request, `/collections/${lower.slice("/collection/".length)}`, 308)
    );
  }

  // Shopify blog home
  if (lower === "/blogs/news" || lower === "/blog/news") {
    return withPaidCookie(request, redirectPath(request, "/blogs", 308));
  }

  // Duplicate catalog index — /shop is canonical. /products/:handle still 308s below.
  if (lower.replace(/\/+$/, "") === "/products") {
    return withPaidCookie(request, redirectPath(request, "/shop", 308));
  }

  // Shopify-era product URLs (+ variant/country/currency) → clean /[slug] in one hop.
  // Prefix strip and `-crazzycars-pk` suffix strip happen together so Meta
  // `/products/{handle}-crazzycars-pk?utm_…` does not 308 twice.
  // Cookie captures fbclid/utm before redirectPath strips them.
  if (lower.startsWith("/products/")) {
    const rest = lower.slice("/products/".length).replace(/\/+$/, "");
    if (rest && !rest.includes("/")) {
      const dest = stripBrandSuffix(rest) || rest;
      return withPaidCookie(request, redirectPath(request, `/${dest}`, 308));
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
      return withPaidCookie(request, NextResponse.redirect(dest, 308));
    }
  }

  const isAccountProtected =
    pathname.startsWith("/account/") &&
    !pathname.startsWith("/account/login") &&
    !pathname.startsWith("/account/register") &&
    !pathname.startsWith("/account/forgot-password") &&
    !pathname.startsWith("/account/reset-password");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-cc-pathname", pathname);
  const paidSource = paidSourceFromRequest(request);
  if (paidSource) requestHeaders.set("x-cc-paid", paidSource);
  const inboundReferer = request.headers.get("referer") || "";
  if (inboundReferer) requestHeaders.set("x-cc-referer", inboundReferer);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  setPaidTrafficCookie(request, response, paidSource);
  const pathSlug = slugFromPathname(pathname);
  if (paidSource || looksLikeProductSlug(pathSlug)) {
    response.cookies.set("cc_path", pathname, {
      path: "/",
      maxAge: 120,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      httpOnly: true,
    });
  }
  let aiHit = null;

  if (!shouldSkipAiVisitPath(pathname)) {
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    aiHit = classifyAiTraffic({
      userAgent,
      referrer,
      url: request.nextUrl,
    });
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
     * Match all paths except static assets / liveness probe.
     * /_next/image is included so disabled Cloudinary optimizer URLs can be short-circuited.
     * Includes public pages (for AI logging) and /account/* (for auth).
     */
    "/_next/image",
    "/((?!_next/static|favicon.ico|api/health|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
