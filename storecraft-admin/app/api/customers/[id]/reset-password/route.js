import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Customer from "@/lib/models/Customer.model";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req, context) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessMinRole(user, "admin");
    if (denied) return denied;

    await dbConnect();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer id." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { newPassword, sendEmail: shouldSendEmail } = body;

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);

    const customer = await Customer.findByIdAndUpdate(
      id,
      {
        $set: {
          password: hashedPassword,
          passwordHash: hashedPassword,
        },
      },
      { new: true }
    ).lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 }
      );
    }

    const loginBase =
      process.env.NEXT_PUBLIC_STORE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL;
    const safePwd = escapeHtml(String(newPassword));
    const greetingName = escapeHtml(customer.firstName?.trim() || "Customer");

    if (shouldSendEmail && customer.email) {
      try {
        const { Resend } = await import("resend");
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: `${process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} <${process.env.FROM_EMAIL}>`,
            to: customer.email,
            subject: `Your Password Has Been Reset - ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
              <div style="background:#111111;padding:24px;text-align:center;">
                <h1 style="color:#C9A84C;margin:0;font-size:20px;letter-spacing:0.1em;">
                  CRAZZYCARS.PK
                </h1>
              </div>
              <div style="padding:32px;background:#ffffff;">
                <h2 style="color:#111111;font-size:20px;margin:0 0 16px;">
                  Password Reset
                </h2>
                <p style="color:#555555;font-size:14px;line-height:1.6;margin:0 0 16px;">
                  Hello ${greetingName},
                </p>
                <p style="color:#555555;font-size:14px;line-height:1.6;margin:0 0 24px;">
                  Your password has been reset by our admin team.
                  Your new password is:
                </p>
                <div style="background:#f8f8f8;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px;">
                  <p style="font-size:20px;font-weight:700;color:#111111;margin:0;letter-spacing:0.1em;font-family:monospace;">
                    ${safePwd}
                  </p>
                </div>
                <p style="color:#888888;font-size:12px;margin:0 0 24px;">
                  Please login and change your password immediately.
                </p>
                <a href="${escapeHtml(loginBase)}/account/login"
                  style="display:inline-block;padding:12px 32px;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:6px;">
                  Login Now
                </a>
              </div>
              <div style="background:#111111;padding:16px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
                  © ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}
                </p>
              </div>
            </div>
          `,
          });
        }
      } catch (emailErr) {
        console.error("Reset password email error:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      { status: 500 }
    );
  }
}
