import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  loginRateLimitKey,
  rateLimitMessage,
  rateLimitResponseInit,
  recordAttempt,
} from "@/lib/loginRateLimit";
import Customer from "@/lib/models/Customer.model";
import { requestIp } from "@/lib/requestIp";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    try {
      await dbConnect();
    } catch (e) {
      console.error("[customer/login] db_connect:", e);
      return NextResponse.json(
        { success: false, error: "Unable to sign in right now. Please try again." },
        { status: 500 }
      );
    }

    // Checked before the customer lookup and bcrypt compare: cheaper under
    // attack, and locked-out responses cannot leak whether the account exists.
    const limitKey = loginRateLimitKey("customer-login", email, requestIp(req));
    const limit = await checkLoginRateLimit(limitKey);
    if (limit.limited) {
      return NextResponse.json(
        { success: false, error: rateLimitMessage(limit.retryAfterSeconds) },
        rateLimitResponseInit(limit.retryAfterSeconds)
      );
    }

    let customer;
    try {
      customer = await Customer.findOne({
        email: email.toLowerCase().trim(),
      });
    } catch (e) {
      console.error("[customer/login] find_customer:", e);
      return NextResponse.json(
        { success: false, error: "Unable to sign in right now. Please try again." },
        { status: 500 }
      );
    }

    if (!customer) {
      await recordAttempt(limitKey);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    let isValid = false;
    try {
      const passwordToCheck = customer.password || customer.passwordHash || "";

      if (!passwordToCheck) {
        await recordAttempt(limitKey);
        return NextResponse.json(
          {
            success: false,
            error: "Account has no password set. Please register again.",
          },
          { status: 401 }
        );
      }

      isValid = await bcrypt.compare(password, passwordToCheck);
    } catch (e) {
      console.error("[customer/login] bcrypt:", e);
      return NextResponse.json(
        { success: false, error: "Unable to sign in right now. Please try again." },
        { status: 500 }
      );
    }

    if (!isValid) {
      await recordAttempt(limitKey);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await clearLoginAttempts(limitKey);

    if (!process.env.JWT_SECRET) {
      console.error("[customer/login] jwt: JWT_SECRET is not set");
      return NextResponse.json(
        { success: false, error: "Unable to sign in right now. Please try again." },
        { status: 500 }
      );
    }

    let token;
    try {
      token = jwt.sign(
        {
          customerId: String(customer._id),
          email: customer.email,
          type: "store_customer",
          sub: String(customer._id),
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );
    } catch (e) {
      console.error("[customer/login] jwt:", e);
      return NextResponse.json(
        { success: false, error: "Unable to sign in right now. Please try again." },
        { status: 500 }
      );
    }

    try {
      customer.lastLogin = new Date();
      await customer.save();
    } catch (e) {
      console.error("[customer/login] last_login save failed:", e);
    }

    const response = NextResponse.json({
      success: true,
      customer: {
        id: String(customer._id),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
    });

    response.cookies.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("[customer/login] unknown:", e);
    return NextResponse.json(
      { success: false, error: "Unable to sign in right now. Please try again." },
      { status: 500 }
    );
  }
}
