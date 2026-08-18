/**
 * Next.js 16+ route guard (formerly middleware). Compiled output is still named middleware.js.
 * Protects admin UI pages — unauthenticated users are redirected to /login.
 * API routes enforce auth separately via getRequestUser (except login + signed wa-action).
 */
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWT_COOKIE_NAME } from "@/lib/constants";

/** Prevent proxies from serving stale HTML that references deleted CSS chunks. */
function noStore(response) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return noStore(NextResponse.next());
  }

  // Public customer tracking page (WhatsApp / storefront links) — no login
  if (pathname === "/track-order" || pathname.startsWith("/track-order/")) {
    return noStore(NextResponse.next());
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return noStore(NextResponse.redirect(loginUrl));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-role", String(payload.role || "viewer"));
    requestHeaders.set("x-user-id", String(payload.userId || ""));

    return noStore(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    );
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(JWT_COOKIE_NAME);
    return noStore(response);
  }
}

export const config = {
  matcher: [
    /*
     * Protect admin pages + apply no-store HTML headers (incl. login / track-order).
     * Does NOT match /api/* or hashed static assets.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
