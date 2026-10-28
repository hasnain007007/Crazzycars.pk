import nodemailer from "nodemailer";
import { Resend } from "resend";
import { formatAdminPrice } from "@/lib/currency";
import { emailButton, getEmailBrand, wrapEmailLayout } from "@/lib/emailLayout";

const RESEND_SANDBOX_FROM = "CrazzyCars.pk <onboarding@resend.dev>";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      !String(process.env.SMTP_PASS).includes("placeholder")
  );
}

function getSmtpTransporter() {
  if (!hasSmtp()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getFromEmail() {
  return String(process.env.FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
}

export function getReplyToEmail() {
  const candidates = [process.env.REPLY_TO_EMAIL, process.env.CONTACT_EMAIL, "info@crazzycars.pk"];
  for (const raw of candidates) {
    const v = String(raw || "").trim().toLowerCase();
    if (!v || !v.includes("@")) continue;
    if (v.includes("imedihelp") || v.includes("onboarding@resend.dev")) continue;
    return v;
  }
  return "info@crazzycars.pk";
}

function buildSender(fromOverride) {
  const storeName = process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";
  const fromEmail = getFromEmail();
  if (fromOverride && String(fromOverride).trim()) return String(fromOverride).trim();
  if (!fromEmail) return null;
  if (fromEmail.includes("<") && fromEmail.includes(">")) return fromEmail;
  return `${storeName} <${fromEmail}>`;
}

function formatResendError(error) {
  if (!error) return "Unknown Resend error";
  if (typeof error === "string") return error;
  return error.message || error.name || "Resend send failed";
}

function isUnverifiedSenderError(error) {
  const text = formatResendError(error).toLowerCase();
  return (
    text.includes("domain is not verified") ||
    text.includes("not verified") ||
    text.includes("invalid from") ||
    text.includes("from address")
  );
}

export async function sendEmail({ to, subject, html, text, from, replyTo: replyToOverride }) {
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length || !recipients[0]) {
    return { success: false, error: "No recipient address" };
  }

  const replyTo = String(replyToOverride || "").trim() || getReplyToEmail();
  const resend = getResend();
  if (resend) {
    const attempts = [];
    const primary = buildSender(from);
    if (primary) attempts.push(primary);
    const verifiedFallback = String(process.env.RESEND_VERIFIED_FROM || "").trim();
    if (verifiedFallback) {
      const vf = verifiedFallback.includes("<")
        ? verifiedFallback
        : `${process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk"} <${verifiedFallback}>`;
      if (!attempts.includes(vf)) attempts.push(vf);
    }
    if (!primary || !String(primary).includes("onboarding@resend.dev")) {
      attempts.push(RESEND_SANDBOX_FROM);
    }
    if (!attempts.length) {
      return { success: false, error: "Email not configured (set FROM_EMAIL)" };
    }

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
      const sender = attempts[i];
      try {
        const payload = {
          from: sender,
          to: recipients,
          subject,
          html,
          replyTo,
        };
        if (text) payload.text = text;
        const { data, error } = await resend.emails.send(payload);
        if (!error) {
          if (i > 0) {
            console.warn(`[email] Primary FROM failed; sent via fallback. from=${sender} id=${data?.id}`);
          }
          return { success: true, messageId: data?.id, from: sender, usedFallback: i > 0 };
        }
        lastError = error;
        console.error(`[email] Resend error (from=${sender}):`, formatResendError(error));
        if (i === 0 && attempts.length > 1 && isUnverifiedSenderError(error)) continue;
        if (i === 0 && attempts.length > 1) continue;
        break;
      } catch (error) {
        lastError = error;
        console.error("Email error:", error);
        if (i === 0 && attempts.length > 1) continue;
        break;
      }
    }
    return { success: false, error: formatResendError(lastError) };
  }

  const transporter = getSmtpTransporter();
  const fromEmail = getFromEmail();
  if (!transporter || !fromEmail) {
    return { success: false, error: "Email not configured (set RESEND_API_KEY + FROM_EMAIL, or SMTP_*)" };
  }

  try {
    const storeName = process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";
    const info = await transporter.sendMail({
      from: `"${storeName}" <${fromEmail}>`,
      to: recipients,
      subject,
      html,
      text: text || undefined,
      replyTo,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: error.message };
  }
}

export function buildOrderConfirmationEmail(order, storeName, logoUrl) {
  const brand = getEmailBrand({ storeName: storeName || undefined, logoUrl: logoUrl || undefined });
  const items =
    order.items
      ?.map(
        (item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid ${brand.border}">
        ${item.name}
        ${item.variation ? `<br><small style="color:${brand.muted}">${item.variation}</small>` : ""}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid ${brand.border};text-align:center">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${brand.border};text-align:right">
        ${formatAdminPrice(item.unitPrice || item.price || 0)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid ${brand.border};text-align:right;font-weight:700">
        ${formatAdminPrice((item.unitPrice || item.price || 0) * item.quantity)}
      </td>
    </tr>`
      )
      .join("") || "";

  const inner = `
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:18px;text-align:center;margin:0 0 20px;">
      <h1 style="margin:0 0 6px;font-size:22px;color:#065F46;">Order confirmed</h1>
      <p style="margin:0;color:#047857;font-size:14px;">Thank you for shopping at ${brand.storeName}.</p>
    </div>
    <p style="margin:0 0 16px;color:${brand.muted};">Dear ${order.customer?.name || "Customer"},</p>
    <div style="background:${brand.card};border:1px solid ${brand.border};border-radius:8px;padding:14px 16px;margin:0 0 18px;">
      <table style="width:100%">
        <tr><td style="color:${brand.muted};font-size:13px;padding:4px 0">Order Number</td><td style="font-weight:700;text-align:right">${order.orderNumber}</td></tr>
        <tr><td style="color:${brand.muted};font-size:13px;padding:4px 0">Order Date</td><td style="text-align:right">${new Date(order.createdAt).toLocaleDateString("en-PK")}</td></tr>
        <tr><td style="color:${brand.muted};font-size:13px;padding:4px 0">Payment</td><td style="text-align:right">${order.paymentMethod || "N/A"}</td></tr>
        <tr><td style="color:${brand.muted};font-size:13px;padding:4px 0">Status</td><td style="text-align:right;font-weight:700">${order.orderStatus || "Pending"}</td></tr>
      </table>
    </div>
    <h3 style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${brand.muted}">Order items</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:${brand.card}">
          <th style="padding:10px 8px;text-align:left;font-size:12px">Product</th>
          <th style="padding:10px 8px;text-align:center;font-size:12px">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px">Price</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px">Total</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>
    <table style="width:100%;margin-bottom:18px">
      <tr><td style="color:${brand.muted};padding:4px 0">Subtotal</td><td style="text-align:right;padding:4px 0">${formatAdminPrice(order.pricing?.subtotal || 0)}</td></tr>
      ${
        order.pricing?.discount > 0
          ? `<tr><td style="color:#16a34a;padding:4px 0">Discount</td><td style="text-align:right;color:#16a34a;padding:4px 0">-${formatAdminPrice(order.pricing.discount)}</td></tr>`
          : ""
      }
      <tr><td style="color:${brand.muted};padding:4px 0">Shipping</td><td style="text-align:right;padding:4px 0">${formatAdminPrice(order.pricing?.shippingCost || 0)}</td></tr>
      <tr style="border-top:2px solid ${brand.black}"><td style="font-weight:700;padding:10px 0;font-size:16px">Total</td><td style="text-align:right;font-weight:700;padding:10px 0;font-size:16px;color:${brand.red}">${formatAdminPrice(order.pricing?.total || 0)}</td></tr>
    </table>
    ${
      order.shippingAddress
        ? `<div style="background:${brand.card};border:1px solid ${brand.border};border-radius:8px;padding:14px 16px;margin-bottom:18px">
      <h3 style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${brand.muted}">Shipping address</h3>
      <p style="margin:0;color:#374151;line-height:1.7;font-size:13px">
        ${order.shippingAddress.name || ""}<br>
        ${order.shippingAddress.street || ""}<br>
        ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""}<br>
        ${order.shippingAddress.country || ""}
      </p>
    </div>`
        : ""
    }
    <div style="text-align:center">${emailButton(`${brand.siteUrl}/shop`, "Continue Shopping")}</div>
  `;

  return wrapEmailLayout(inner, {
    storeName: brand.storeName,
    logoUrl: brand.logoUrl,
    eyebrow: "Order confirmation",
    preheader: `Order ${order.orderNumber || ""} confirmed`,
  });
}

export function buildShippingEmail(order, storeName, logoUrl) {
  const brand = getEmailBrand({ storeName: storeName || undefined, logoUrl: logoUrl || undefined });
  const trackingNumber = order.tracking?.number || order.trackingNumber || "";
  const trackingUrl =
    order.tracking?.url ||
    (trackingNumber ? `${brand.trackUrl}?tracking=${encodeURIComponent(trackingNumber)}` : brand.trackUrl);

  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${brand.black}">Your order has shipped</h1>
    <p style="margin:0 0 18px;color:${brand.muted}">Great news, ${order.customer?.name || "Customer"} — order <strong style="color:${brand.black}">${order.orderNumber}</strong> is on the way.</p>
    ${
      trackingNumber
        ? `<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:20px;margin:0 0 18px;text-align:center">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${brand.muted}">Tracking number</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:${brand.black}">${trackingNumber}</p>
      <p style="margin:6px 0 0;color:${brand.muted}">${order.tracking?.carrier || order.courier || "Courier"}</p>
      <div style="margin-top:14px">${emailButton(trackingUrl, "Track your package")}</div>
    </div>`
        : ""
    }
    <p style="margin:0;color:${brand.muted}">Thank you for shopping at ${brand.storeName}.</p>
  `;

  return wrapEmailLayout(inner, {
    storeName: brand.storeName,
    logoUrl: brand.logoUrl,
    eyebrow: "Shipping update",
    preheader: `Order ${order.orderNumber || ""} shipped`,
  });
}

export async function recordEmailSent(orderId, emailType, subject, to, resultStatus = "sent") {
  try {
    if (!orderId) return;
    const { dbConnect } = await import("@/lib/db");
    const OrderMod = (await import("@/lib/models/Order.model")).default;
    await dbConnect();
    await OrderMod.findByIdAndUpdate(String(orderId), {
      $push: {
        emailHistory: {
          type: emailType,
          subject: subject || "",
          to: to || "",
          sentAt: new Date(),
          status: resultStatus === "failed" ? "failed" : "sent",
        },
      },
    });
  } catch (e) {
    console.error("Error recording email:", e);
  }
}
