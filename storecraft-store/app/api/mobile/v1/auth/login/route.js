/**
 * POST /api/mobile/v1/auth/login
 * Email + password only (matches web accounts). No OTP / phone login in v1.
 * Optional body.deviceToken links a guest-registered push device to the user.
 * Rate limited: mobile-login (5 / 10min per email+IP) via Mongo LoginAttempt.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import MobileDevice from "@/lib/models/MobileDevice.model";
import { comparePassword } from "@/lib/auth";
import { signMobileAccessToken } from "@/lib/mobile/auth";
import { issueRefreshToken } from "@/lib/mobile/refreshToken";
import { mobileError } from "@/lib/mobile/response";
import { requestIp } from "@/lib/requestIp";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  recordActionAttempt,
} from "@/lib/actionRateLimit";

export const dynamic = "force-dynamic";

const LOGIN_RATE = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

function serializeCustomer(c) {
  return {
    id: String(c._id),
    name: c.name || "",
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    email: c.email || "",
    phone: c.phone || "",
    isVerified: Boolean(c.isVerified),
    createdAt: c.createdAt,
  };
}

export async function POST(request) {
  const ip = requestIp(request);
  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const deviceToken = String(body.deviceToken || "").trim();

  if (!email) {
    return mobileError("VALIDATION_ERROR", "Email is required.", {
      status: 400,
      fields: { email: "Email is required." },
    });
  }
  if (!password) {
    return mobileError("VALIDATION_ERROR", "Password is required.", {
      status: 400,
      fields: { password: "Password is required." },
    });
  }

  const rateLimitKey = actionRateLimitKey("mobile-login", email, ip);
  const rateLimit = await checkActionRateLimit(rateLimitKey, LOGIN_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Please wait before trying again.",
          retryAfterSeconds: retryAfterSec,
        },
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  await dbConnect();

  const customer = await Customer.findOne({ email });
  if (!customer) {
    await recordActionAttempt(rateLimitKey, LOGIN_RATE);
    return mobileError("INVALID_CREDENTIALS", "Incorrect email or password.", { status: 401 });
  }

  if (customer.isActive === false) {
    await recordActionAttempt(rateLimitKey, LOGIN_RATE);
    return mobileError("ACCOUNT_INACTIVE", "This account has been deactivated.", { status: 403 });
  }

  const hash = customer.passwordHash || customer.password || "";
  if (!hash) {
    await recordActionAttempt(rateLimitKey, LOGIN_RATE);
    return mobileError("NO_PASSWORD", "Password login is not set up for this account.", { status: 401 });
  }

  const valid = await comparePassword(password, hash);
  if (!valid) {
    await recordActionAttempt(rateLimitKey, LOGIN_RATE);
    return mobileError("INVALID_CREDENTIALS", "Incorrect email or password.", { status: 401 });
  }

  try {
    customer.lastLogin = new Date();
    await customer.save();
  } catch {
    /* non-fatal */
  }

  if (deviceToken) {
    try {
      await MobileDevice.updateOne(
        { token: deviceToken },
        { $set: { customerId: customer._id, updatedAt: new Date() } },
        { upsert: false }
      );
    } catch {
      /* non-fatal */
    }
  }

  let accessToken;
  let refreshToken;
  try {
    accessToken = signMobileAccessToken({
      sub: customer._id,
      customerId: customer._id,
      email: customer.email,
    });
    const issued = await issueRefreshToken(customer._id);
    refreshToken = issued.opaqueToken;
  } catch (err) {
    console.error("[mobile/auth/login] token issue:", err);
    return mobileError(err.code || "CONFIG_ERROR", err.message || "Auth misconfigured.", {
      status: err.statusCode || 500,
    });
  }

  return NextResponse.json({
    customer: serializeCustomer(customer),
    accessToken,
    refreshToken,
    expiresIn: 900,
    tokenType: "Bearer",
  });
}
