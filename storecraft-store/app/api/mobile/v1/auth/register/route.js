/**
 * POST /api/mobile/v1/auth/register
 * Same fields as web: firstName, lastName, email, password, phone.
 * Returns mobile access + refresh tokens (does NOT set web cookies).
 * Rate limited via Mongo LoginAttempt.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { hashPassword } from "@/lib/auth";
import { normalizePkMobile, isValidPkMobile } from "@/lib/customerPhone";
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

const REGISTER_RATE = { maxAttempts: 3, windowMs: 15 * 60 * 1000 };

function isValidEmail(email) {
  return Boolean(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phoneRaw = String(body.phone || "").trim();
  const password = String(body.password || "");

  const fields = {};
  if (!firstName) fields.firstName = "First name is required.";
  if (!lastName) fields.lastName = "Last name is required.";
  if (!email || !isValidEmail(email)) fields.email = "A valid email is required.";
  if (!phoneRaw || !isValidPkMobile(phoneRaw)) {
    fields.phone = "Enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX).";
  }
  if (!password || password.length < 6) fields.password = "Password must be at least 6 characters.";

  if (Object.keys(fields).length) {
    return mobileError("VALIDATION_ERROR", "Validation failed.", { status: 400, fields });
  }

  const phone = normalizePkMobile(phoneRaw);
  const rateLimitKey = actionRateLimitKey("mobile-register", email, ip);
  const rateLimit = await checkActionRateLimit(rateLimitKey, REGISTER_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many registration attempts. Please wait before trying again.",
          retryAfterSeconds: retryAfterSec,
        },
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  await dbConnect();

  const phoneExists = await Customer.findOne({ phone }).select("_id").lean();
  if (phoneExists) {
    await recordActionAttempt(rateLimitKey, REGISTER_RATE);
    return mobileError("PHONE_TAKEN", "This phone number is already registered.", { status: 409 });
  }
  const emailExists = await Customer.findOne({ email }).select("_id").lean();
  if (emailExists) {
    await recordActionAttempt(rateLimitKey, REGISTER_RATE);
    return mobileError("EMAIL_TAKEN", "This email address is already registered.", { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const name = `${firstName} ${lastName}`.trim();

  let customer;
  try {
    customer = await Customer.create({
      name,
      firstName,
      lastName,
      email,
      phone,
      password: passwordHash,
      passwordHash,
      isActive: true,
      isVerified: false,
    });
  } catch (err) {
    if (err.code === 11000) {
      return mobileError("CONFLICT", "Account already exists with this phone or email.", { status: 409 });
    }
    console.error("[mobile/register]", err);
    return mobileError("INTERNAL_ERROR", "Could not create account. Please try again.", { status: 500 });
  }

  let accessToken;
  let refreshToken;
  try {
    accessToken = signMobileAccessToken({
      sub: String(customer._id),
      customerId: String(customer._id),
      email: customer.email,
    });
    const issued = await issueRefreshToken(customer._id);
    refreshToken = issued.opaqueToken;
  } catch (err) {
    return mobileError(err.code || "CONFIG_ERROR", err.message || "Auth misconfigured.", {
      status: err.statusCode || 500,
    });
  }

  await recordActionAttempt(rateLimitKey, REGISTER_RATE);

  return NextResponse.json(
    {
      customer: serializeCustomer(customer),
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: "Bearer",
    },
    { status: 201 }
  );
}
