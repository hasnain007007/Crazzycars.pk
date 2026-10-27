/**
 * POST /api/mobile/v1/auth/logout
 * Revoke a specific refresh token. Auth is optional.
 * Body: { refreshToken?: string }
 */
import { NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/mobile/refreshToken";
import { mobileError } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  const rawToken = String(body.refreshToken || "").trim();
  if (!rawToken) {
    return mobileError("VALIDATION_ERROR", "refreshToken is required.", { status: 400 });
  }

  try {
    await revokeRefreshToken(rawToken);
  } catch {
    /* non-fatal — already revoked or not found */
  }

  return NextResponse.json({ success: true, message: "Logged out successfully." });
}
