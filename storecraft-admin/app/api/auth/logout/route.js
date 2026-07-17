/**
 * Auth logout API route that clears JWT cookie.
 */
import { NextResponse } from "next/server";
import { logActivity, verifyToken } from "@/lib/auth";
import { JWT_COOKIE_NAME } from "@/lib/constants";

export async function POST(request) {
  try {
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;

    if (payload) {
      await logActivity({
        user: payload.userId,
        userName: payload.name,
        action: "User logged out",
        resource: "Auth",
        resourceId: payload.userId,
        type: "logout",
        ip: request.headers.get("x-forwarded-for") || "",
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(JWT_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Logout failed." },
      { status: 500 }
    );
  }
}
