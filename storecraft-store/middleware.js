import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  STORE_JWT_COOKIE_NAME,
  STORE_JWT_COOKIE_NAME_LEGACY,
} from "@/lib/constants";
import { classifyAiTraffic, shouldSkipAiVisitPath } from "@/lib/aiAgentTraffic";
import { applyAiAttributionCookies } from "@/lib/aiAttribution";

/**
 * - Log AI crawler / AI-referrer traffic (non-blocking).
 * - Tag first-touch AI-referrer attribution cookies (14-day window).
 * - Protect storefront account pages (login/register excluded via path checks).
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Shopify-era product URLs (Meta carousel ads, old bookmarks) → /[slug] PDP.
  // Keep /products (listing) as-is; only redirect /products/:slug.
  if (pathname.startsWith("/products/")) {
    const rest = pathname.slice("/products/".length).replace(/\/+$/, "");
    if (rest && !rest.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${rest}`;
      return NextResponse.redirect(url, 308);
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
      const ingestUrl = new URL("/api/analytics/ai-visit", request.url);
      const secret =
        process.env.AI_VISIT_INGEST_SECRET ||
        process.env.REVALIDATE_SECRET ||
        process.env.CRON_SECRET ||
        "";
      const headers = { "content-type": "application/json" };
      if (secret) headers["x-ai-visit-secret"] = secret;
      // Fire-and-forget — Edge runtime must not await Mongo work here.
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
     * Match all paths except static assets / Next internals.
     * Includes public pages (for AI logging) and /account/* (for auth).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
