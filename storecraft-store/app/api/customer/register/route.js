import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendCustomerWelcomeEmail } from "@/lib/customerLifecycleEmail";
import {
  guestEmailForNormalizedPhone,
  isValidPkMobile,
  normalizePkMobile,
} from "@/lib/customerPhone";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  rateLimitResponse,
  recordActionAttempt,
} from "@/lib/actionRateLimit";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  loginRateLimitKey,
  rateLimitMessage,
  rateLimitResponseInit,
  recordAttempt,
} from "@/lib/loginRateLimit";
import { requestIp } from "@/lib/requestIp";

const REGISTER_IP_MAX = 3;
const REGISTER_IP_WINDOW_MS = 24 * 60 * 60 * 1000;

function hasPassword(doc) {
  return Boolean(String(doc?.passwordHash || "").trim() || String(doc?.password || "").trim());
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = normalizePkMobile(body.phone);

    if (!firstName || !lastName || !email || !password || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "First name, last name, email, phone, and password are required.",
        },
        { status: 400 }
      );
    }

    if (!isValidPkMobile(phone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid Pakistani mobile (e.g. 03XX XXXXXXX)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const ip = requestIp(req) || "unknown";

    // Email-scoped limiter (shared pattern with login)
    const emailKey = loginRateLimitKey("customer-register", email, ip);
    const emailLimit = await checkLoginRateLimit(emailKey);
    if (emailLimit.limited) {
      return NextResponse.json(
        { success: false, error: rateLimitMessage(emailLimit.retryAfterSeconds) },
        rateLimitResponseInit(emailLimit.retryAfterSeconds)
      );
    }

    // IP: max 3 successful-or-attempted registrations per day
    const ipKey = actionRateLimitKey("customer-register-ip", "ip", ip);
    const ipLimit = await checkActionRateLimit(ipKey, {
      maxAttempts: REGISTER_IP_MAX,
      windowMs: REGISTER_IP_WINDOW_MS,
    });
    if (ipLimit.limited) {
      return rateLimitResponse(
        ipLimit.remainingMs,
        "Too many accounts created from this network today. Please try again tomorrow."
      );
    }

    try {
      await dbConnect();
    } catch (e) {
      console.error("[register] db_connect:", e);
      return NextResponse.json(
        { success: false, error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    const guestEmail = guestEmailForNormalizedPhone(phone);
    const byEmail = await Customer.findOne({ email }).select("+password +passwordHash").lean();
    const byPhone = await Customer.findOne({ phone }).select("+password +passwordHash").lean();
    const byGuestEmail = guestEmail
      ? await Customer.findOne({ email: guestEmail }).select("+password +passwordHash").lean()
      : null;

    if (byEmail && hasPassword(byEmail)) {
      await recordAttempt(emailKey);
      return NextResponse.json(
        { success: false, error: "Email already registered. Please login." },
        { status: 400 }
      );
    }

    if (byPhone && hasPassword(byPhone) && String(byPhone._id) !== String(byEmail?._id || "")) {
      await recordAttempt(emailKey);
      return NextResponse.json(
        {
          success: false,
          error: "This phone number is already linked to an account. Please login.",
        },
        { status: 400 }
      );
    }

    // Claimable guest rows (no password): prefer email match, then phone, then guest+phone email
    let claimId = null;
    if (byEmail && !hasPassword(byEmail)) claimId = byEmail._id;
    else if (byPhone && !hasPassword(byPhone)) claimId = byPhone._id;
    else if (byGuestEmail && !hasPassword(byGuestEmail)) claimId = byGuestEmail._id;

    if (!process.env.JWT_SECRET) {
      console.error("[register] JWT_SECRET is not set");
      return NextResponse.json(
        { success: false, error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const displayName = `${firstName} ${lastName}`.trim();
    const fields = {
      firstName,
      lastName,
      name: displayName,
      email,
      phone,
      password: hashedPassword,
      passwordHash: hashedPassword,
      isActive: true,
      updatedAt: new Date(),
    };

    let customer;
    try {
      if (claimId) {
        customer = await Customer.findByIdAndUpdate(
          claimId,
          { $set: fields },
          { new: true }
        ).lean();
      } else {
        customer = await Customer.create(fields);
        customer = customer.toObject ? customer.toObject() : customer;
      }
    } catch (e) {
      await recordAttempt(emailKey);
      if (e?.code === 11000) {
        const msg = String(e.message || "");
        if (msg.includes("phone")) {
          return NextResponse.json(
            {
              success: false,
              error: "This phone number is already linked to an account. Please login.",
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, error: "Email already registered. Please login." },
          { status: 400 }
        );
      }
      throw e;
    }

    await recordActionAttempt(ipKey, { windowMs: REGISTER_IP_WINDOW_MS });
    await clearLoginAttempts(emailKey);

    const token = jwt.sign(
      {
        customerId: String(customer._id),
        sub: String(customer._id),
        email: customer.email,
        type: "store_customer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const response = NextResponse.json({
      success: true,
      customer: {
        id: String(customer._id),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || "",
      },
    });

    response.cookies.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    sendCustomerWelcomeEmail({
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.name,
      email: customer.email,
    }).catch((e) => console.error("[register] welcome email:", e?.message || e));

    return response;
  } catch (e) {
    console.error("[register] error:", e);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
