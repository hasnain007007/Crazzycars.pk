/**
 * Auth login API route that validates admin credentials and issues JWT cookie.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import {
  JWT_REMEMBER_EXPIRY,
  JWT_REMEMBER_MAX_AGE_SEC,
  JWT_SESSION_EXPIRY,
  JWT_SESSION_MAX_AGE_SEC,
  logActivity,
} from "@/lib/auth";
import { JWT_COOKIE_NAME } from "@/lib/constants";
import { dbConnect } from "@/lib/db";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  loginRateLimitKey,
  rateLimitMessage,
  rateLimitResponseInit,
  recordAttempt,
} from "@/lib/loginRateLimit";
import User from "@/lib/models/User.model";
import { requestIp } from "@/lib/requestIp";

export async function POST(request) {
  try {
    await dbConnect();
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: JWT_SECRET is not set." },
        { status: 500 }
      );
    }

    // Checked before the user lookup and bcrypt compare: cheaper under attack,
    // and it keeps locked-out responses from leaking whether the account exists.
    const limitKey = loginRateLimitKey("admin-login", email, requestIp(request));
    const limit = await checkLoginRateLimit(limitKey);
    if (limit.limited) {
      return NextResponse.json(
        { success: false, error: rateLimitMessage(limit.retryAfterSeconds) },
        rateLimitResponseInit(limit.retryAfterSeconds)
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      await recordAttempt(limitKey);
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      await recordAttempt(limitKey);
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await clearLoginAttempts(limitKey);

    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, error: "This account is inactive. Contact a superadmin." },
        { status: 403 }
      );
    }

    const persistSession = rememberMe !== false;
    const tokenExpiry = persistSession ? JWT_REMEMBER_EXPIRY : JWT_SESSION_EXPIRY;
    const cookieMaxAge = persistSession ? JWT_REMEMBER_MAX_AGE_SEC : JWT_SESSION_MAX_AGE_SEC;

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    user.lastLogin = new Date();
    await user.save();

    await logActivity({
      user: user._id,
      userName: user.name,
      action: "User logged in",
      resource: "Auth",
      resourceId: user._id.toString(),
      type: "login",
      ip: request.headers.get("x-forwarded-for") || "",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cookieMaxAge,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Login failed." },
      { status: 500 }
    );
  }
}
