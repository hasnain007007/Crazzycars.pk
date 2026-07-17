/**
 * Next.js 16+ route guard (formerly middleware). Compiled output is still named middleware.js.
 * Add new admin sections to `config.matcher` so unauthenticated users cannot load those pages.
 */
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWT_COOKIE_NAME } from "@/lib/constants";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-role", String(payload.role || "viewer"));
    requestHeaders.set("x-user-id", String(payload.userId || ""));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(JWT_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/catalog",
    "/catalog/:path*",
    "/car-catalog",
    "/car-catalog/:path*",
    "/orders",
    "/orders/:path*",
    "/customers",
    "/customers/:path*",
    "/users",
    "/users/:path*",
    "/blog-manager",
    "/blog-manager/:path*",
    "/pages-manager",
    "/pages-manager/:path*",
    "/reviews",
    "/reviews/:path*",
    "/product-options",
    "/product-options/:path*",
    "/banners",
    "/banners/:path*",
    "/redirects",
    "/redirects/:path*",
    "/shipping",
    "/shipping/:path*",
    "/coupons",
    "/coupons/:path*",
    "/reports",
    "/reports/:path*",
    "/settings",
    "/settings/:path*",
    "/activity-log",
    "/activity-log/:path*",
  ],
};
