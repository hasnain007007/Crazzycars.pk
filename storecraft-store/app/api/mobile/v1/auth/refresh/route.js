/**
 * POST /api/mobile/v1/auth/refresh
 * Rotate refresh token and issue a new access token.
 * Body: { refreshToken: string }
 * Replay of a revoked token revokes ALL sessions for the customer.
 */
import { NextResponse } from "next/server";
import Customer from "@/lib/models/Customer.model";
import { dbConnect } from "@/lib/db";
import { signMobileAccessToken } from "@/lib/mobile/auth";
import { rotateRefreshToken } from "@/lib/mobile/refreshToken";
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
    const { opaqueToken: newRefreshToken, customerId } = await rotateRefreshToken(rawToken);

    await dbConnect();
    const customer = await Customer.findById(customerId).select("email isActive").lean();
    if (!customer || customer.isActive === false) {
      return mobileError("ACCOUNT_INACTIVE", "Account not found or inactive.", { status: 401 });
    }

    const accessToken = signMobileAccessToken({
      sub: customerId,
      customerId,
      email: customer.email || "",
    });

    return NextResponse.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    const code = err.code || "TOKEN_INVALID";
    const message = err.message || "Invalid refresh token.";
    const status = err.statusCode || 401;
    return mobileError(code, message, { status });
  }
}
