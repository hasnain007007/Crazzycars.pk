import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { checkLoginRateLimit, loginRateLimitKey, recordAttempt } from "@/lib/loginRateLimit";
import Customer from "@/lib/models/Customer.model";
import { requestIp } from "@/lib/requestIp";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} <${process.env.FROM_EMAIL}>`,
        to: customer.email,
        subject: `Reset Your Password - ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f8f8f8;font-family:Arial,sans-serif;">
            <div style="max-width:500px;margin:0 auto;background:#ffffff;">
              
              <div style="background:#111111;padding:28px 32px;text-align:center;">
                <h1 style="color:#D72323;font-size:22px;margin:0;letter-spacing:0.15em;">
                  Crazzycars.pk
                </h1>
              </div>

              <div style="padding:40px 32px;text-align:center;">
                <p style="font-size:40px;margin:0 0 16px;">🔐</p>
                <h2 style="font-size:22px;font-weight:700;color:#111111;margin:0 0 12px;">
                  Reset Your Password
                </h2>
                <p style="font-size:14px;color:#888888;margin:0 0 32px;line-height:1.6;">
                  Hello ${customer.firstName || "there"},<br/>
                  Click the button below to reset your password.
                  This link expires in 1 hour.
                </p>

                <a href="${resetUrl}"
                  style="display:inline-block;padding:14px 40px;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-radius:6px;">
                  Reset Password
                </a>

                <p style="font-size:12px;color:#aaaaaa;margin:24px 0 0;line-height:1.6;">
                  If you did not request this, ignore this email.<br/>
                  Your password will not change.
                </p>
              </div>

              <div style="background:#111111;padding:20px 32px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
                  © ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}. All rights reserved.
                </p>
              </div>

            </div>
          </body>
          </html>
        `,
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
