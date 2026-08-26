import { NextResponse } from "next/server";
import { getAdminEmail, getFromEmail, sendEmail, sendTestEmail } from "@/lib/email";

/**
 * Temporary email diagnostics for launch unblock.
 * GET  — config probe (no send). Requires x-revalidate-secret.
 * POST — send a real test email. Body: { to?: string }. Requires x-revalidate-secret.
 */
function authorized(req) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  return req.headers.get("x-revalidate-secret") === secret;
}

export async function GET(req) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const fromEmail = getFromEmail();
  return NextResponse.json({
    success: true,
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    resendKeyPrefix: process.env.RESEND_API_KEY
      ? String(process.env.RESEND_API_KEY).slice(0, 7)
      : null,
    fromEmail,
    fromName: process.env.FROM_NAME || null,
    adminEmail: process.env.ADMIN_EMAIL || null,
    contactEmail: process.env.CONTACT_EMAIL || null,
    resolvedAdminInbox: getAdminEmail(),
  });
}

export async function POST(req) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const to = String(body.to || "").trim();

  if (body.probeOnly) {
    // Attempt a no-op-ish send to reveal Resend's real rejection reason.
    const result = await sendEmail({
      to: to || getAdminEmail(),
      subject: "Homefy.pk email probe",
      html: "<p>Probe — ignore.</p>",
    });
    return NextResponse.json({
      success: result.success,
      error: result.error || null,
      messageId: result.messageId || null,
      from: result.from || null,
      usedFallback: result.usedFallback || false,
      to: to || getAdminEmail(),
      configuredFrom: getFromEmail(),
    });
  }

  const result = await sendTestEmail(to || undefined);
  return NextResponse.json({
    success: result.success,
    error: result.error || null,
    messageId: result.messageId || null,
    from: result.from || null,
    usedFallback: result.usedFallback || false,
    to: result.to,
    configuredFrom: getFromEmail(),
  });
}
