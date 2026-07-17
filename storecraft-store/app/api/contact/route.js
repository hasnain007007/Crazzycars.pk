import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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
      return NextResponse.json({
        success: false,
        error: "Please fill in all required fields",
      });
    }

    const hasSmtp =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      !String(process.env.SMTP_PASS).includes("placeholder");

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeSubject = escapeHtml(subject?.trim() || "");
    const safeMessage = escapeHtml(message.trim());
    const safeOrder = escapeHtml(orderNumber?.trim() || "");

    if (hasSmtp) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(String(process.env.SMTP_PORT || "587"), 10) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const storeLabel = process.env.NEXT_PUBLIC_STORE_NAME || "Store";
      const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER;
      const toAddr = process.env.CONTACT_EMAIL || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `"${storeLabel}" <${fromAddr}>`,
        to: toAddr,
        replyTo: email.trim(),
        subject: `Contact Form: ${subject?.trim() || "New message"} — ${name.trim()}`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 600px;">
            <h2 style="color: #009688; font-family: 'Libre Baskerville', Georgia, serif;">New Contact Form Submission</h2>
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
          </div>
        `,
      });
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
