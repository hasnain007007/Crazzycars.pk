import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { checkLoginRateLimit, loginRateLimitKey, recordAttempt } from "@/lib/loginRateLimit";
import Customer from "@/lib/models/Customer.model";
import { requestIp } from "@/lib/requestIp";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "@/lib/customerLifecycleEmail";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Every request counts here, not only failures — the abuse case is
    // mailbombing an address rather than guessing a secret. A limited request
    // returns the same generic success as any other, so the response still says
    // nothing about whether the address is registered.
    const limitKey = loginRateLimitKey("customer-password-reset", email, requestIp(req));
    const limit = await checkLoginRateLimit(limitKey);
    if (limit.limited) {
      return NextResponse.json({ success: true });
    }
    await recordAttempt(limitKey);

    const customer = await Customer.findOne({
      email: email.toLowerCase().trim(),
    });

    // Always return success to prevent email enumeration
    if (!customer) {
      return NextResponse.json({ success: true });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[forgot-password] JWT_SECRET is not set");
      return NextResponse.json({ success: true });
    }

    const resetToken = jwt.sign(
      {
        customerId: String(customer._id),
        email: customer.email,
        type: "password_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL;

    const resetUrl = `${BASE_URL}/account/reset-password?token=${encodeURIComponent(resetToken)}`;

    const storedHash = customer.password || customer.passwordHash || "";
    if (!storedHash) {
      return NextResponse.json({ success: true });
    }

    try {
      await sendPasswordResetEmail({
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customer.name,
        email: customer.email,
        reset_link: resetUrl,
      });
    } catch (emailErr) {
      console.error("Reset email error:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      { status: 500 }
    );
  }
}
