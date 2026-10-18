/**
 * POST /api/mobile/v1/contact
 * Contact form. Rate limited: mobile-contact (3 / 60min per email+IP).
 * Body: { name, email, subject?, message, orderNumber? }
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAdminEmail, getFromEmail, sendEmail } from "@/lib/email";
import { mobileError } from "@/lib/mobile/response";
import { requestIp } from "@/lib/requestIp";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  recordActionAttempt,
} from "@/lib/actionRateLimit";

export const dynamic = "force-dynamic";

const CONTACT_RATE = { maxAttempts: 3, windowMs: 60 * 60 * 1000 };

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(e) {
  return Boolean(e) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const subject = String(body.subject || "Customer Inquiry").trim();
  const message = String(body.message || "").trim();
  const orderNumber = String(body.orderNumber || "").trim();

  const fields = {};
  if (!name) fields.name = "Name is required.";
  if (!email || !isValidEmail(email)) fields.email = "Valid email is required.";
  if (!message || message.length < 10) fields.message = "Message must be at least 10 characters.";

  if (Object.keys(fields).length) {
    return mobileError("VALIDATION_ERROR", "Validation failed.", { status: 400, fields });
  }

  const ip = requestIp(request);
  // Per IP only: keying on the submitted email let a sender rotate emails past the cap.
  const rateLimitKey = actionRateLimitKey("mobile-contact", "any", ip);

  await dbConnect();
  const rateLimit = await checkActionRateLimit(rateLimitKey, CONTACT_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many messages sent. Please try again later.", retryAfterSeconds: retryAfterSec } },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  await recordActionAttempt(rateLimitKey, CONTACT_RATE);

  const fromEmail = getFromEmail();
  if (!process.env.RESEND_API_KEY || !fromEmail) {
    return NextResponse.json({ success: true, message: "Message received. We will get back to you soon." });
  }

  try {
    const adminEmail = getAdminEmail();
    const emailSubject = `[Mobile] ${escapeHtml(subject)} — ${escapeHtml(name)}`;
    const html = `
<h2>Mobile App Contact Form</h2>
<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
${orderNumber ? `<p><strong>Order:</strong> ${escapeHtml(orderNumber)}</p>` : ""}
<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
<hr />
<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
`;
    await sendEmail({
      to: adminEmail,
      from: fromEmail,
      subject: emailSubject,
      html,
      replyTo: email,
    });
  } catch (err) {
    console.error("[mobile/contact] email error:", err);
    // Still return success — message was rate-limited, do not fail silently
  }

  return NextResponse.json({ success: true, message: "Message sent. We will get back to you soon." });
}
