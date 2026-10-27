/**
 * POST /api/mobile/v1/devices — Register or update a device.
 *   Body: { token, platform, appVersion? }
 *   Auth: optional Bearer. Guest devices accepted.
 *   On login, call POST /auth/login with deviceToken to link the device.
 *
 * DELETE /api/mobile/v1/devices?token=... — Remove a device.
 *   Auth: Bearer OR same device token in body/query.
 *
 * Rate limited: mobile-devices (5 / 10min per IP).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import MobileDevice from "@/lib/models/MobileDevice.model";
import { optionalMobileAuth } from "@/lib/mobile/auth";
import { mobileError } from "@/lib/mobile/response";
import { requestIp } from "@/lib/requestIp";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  recordActionAttempt,
} from "@/lib/actionRateLimit";

export const dynamic = "force-dynamic";

const DEVICE_RATE = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

export async function POST(request) {
  const ip = requestIp(request);
  const rateLimitKey = actionRateLimitKey("mobile-devices", "device", ip);
  const rateLimit = await checkActionRateLimit(rateLimitKey, DEVICE_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests.", retryAfterSeconds: retryAfterSec } },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  const token = String(body.token || "").trim();
  const platform = String(body.platform || "").trim().slice(0, 20);
  const appVersion = String(body.appVersion || "").trim().slice(0, 20);

  if (!token) {
    return mobileError("VALIDATION_ERROR", "device token is required.", { status: 400, fields: { token: "Required." } });
  }

  await dbConnect();
  let customerId = null;
  try {
    const auth = await optionalMobileAuth(request);
    customerId = auth?.customer?._id || null;
  } catch {
    /* non-fatal */
  }

  try {
    await MobileDevice.updateOne(
      { token },
      { $set: { token, platform, appVersion, updatedAt: new Date(), ...(customerId ? { customerId } : {}) } },
      { upsert: true }
    );
  } catch (err) {
    console.error("[mobile/devices POST]", err);
    return mobileError("INTERNAL_ERROR", "Could not register device.", { status: 500 });
  }

  await recordActionAttempt(rateLimitKey, DEVICE_RATE);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request) {
  const ip = requestIp(request);
  const { searchParams } = new URL(request.url);
  const tokenFromQuery = (searchParams.get("token") || "").trim();

  let tokenFromBody = "";
  try {
    const body = await request.json();
    tokenFromBody = String(body.token || "").trim();
  } catch {
    /* query-only is fine */
  }

  const token = tokenFromQuery || tokenFromBody;
  if (!token) {
    return mobileError("VALIDATION_ERROR", "device token is required.", { status: 400 });
  }

  await dbConnect();
  let authCustomerId = null;
  try {
    const auth = await optionalMobileAuth(request);
    authCustomerId = auth?.customer?._id || null;
  } catch {
    /* non-fatal */
  }

  // Allow: authenticated customer who owns the device, OR same token (guest self-delete)
  const existing = await MobileDevice.findOne({ token }).lean();
  if (!existing) {
    return NextResponse.json({ success: true }); // idempotent
  }

  const ownsDevice =
    authCustomerId && existing.customerId && String(existing.customerId) === String(authCustomerId);
  const selfDelete = !existing.customerId; // guest device — anyone with the token can delete

  if (!ownsDevice && !selfDelete) {
    return mobileError("FORBIDDEN", "You do not have permission to delete this device.", { status: 403 });
  }

  await MobileDevice.deleteOne({ token });
  return NextResponse.json({ success: true });
}
