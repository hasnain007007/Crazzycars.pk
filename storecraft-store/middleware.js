import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
const STORE_JWT_COOKIE_NAME = "sialkot_store_token";
const STORE_JWT_COOKIE_NAME_LEGACY = "sialkot_store_token_legacy";

/**
 * Protect storefront account pages only. Blog, shop, and public APIs stay open.
 * Login and register are excluded via matcher (they never hit this middleware).
 */
export async function middleware(request) {
  const token =
    request.cookies.get(STORE_JWT_COOKIE_NAME)?.value ||
    request.cookies.get(STORE_JWT_COOKIE_NAME_LEGACY)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/account/login", request.url));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/account/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload?.type !== "store_customer" || !payload?.sub) {
      return NextResponse.redirect(new URL("/account/login", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/account/login", request.url));
  }
}

export const config = {
  matcher: ["/account/((?!login|register|forgot-password|reset-password).*)"],
};
