import { NextResponse } from "next/server";
import { getAdminEmail, getFromEmail, sendEmail } from "@/lib/email";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, subject, message, orderNumber } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    const fromEmail = getFromEmail();
    if (!process.env.RESEND_API_KEY || !fromEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Contact form is temporarily unavailable. Please try WhatsApp or email us directly.",
        },
        { status: 503 }
      );
    }

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeSubject = escapeHtml(subject?.trim() || "");
    const safeMessage = escapeHtml(message.trim());
    const safeOrder = escapeHtml(orderNumber?.trim() || "");

    const storeLabel = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
    const toAddr = process.env.CONTACT_EMAIL || getAdminEmail();

    const result = await sendEmail({
      to: toAddr,
      subject: `Contact Form: ${subject?.trim() || "New message"} — ${name.trim()}`,
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #009688;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 140px;">Name:</td>
                <td style="padding: 8px;">${safeName}</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;"><a href="mailto:${encodeURIComponent(email.trim())}">${safeEmail}</a></td>
              </tr>
              ${
                safeSubject
                  ? `<tr><td style="padding: 8px; font-weight: bold;">Subject:</td><td style="padding: 8px;">${safeSubject}</td></tr>`
                  : ""
              }
              ${
                safeOrder
                  ? `<tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold;">Order #:</td><td style="padding: 8px;">${safeOrder}</td></tr>`
                  : ""
              }
              <tr>
                <td style="padding: 8px; font-weight: bold; vertical-align: top;">Message:</td>
                <td style="padding: 8px; white-space: pre-wrap;">${safeMessage}</td>
              </tr>
            </table>
            <p style="color:#999;font-size:12px;margin-top:16px;">Sent via ${storeLabel} contact form</p>
          </div>
        `,
      from: `${storeLabel} Contact <${fromEmail}>`,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (e) {
    console.error("Contact form error:", e);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
