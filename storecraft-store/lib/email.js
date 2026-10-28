import { Resend } from "resend";
import { formatPrice } from "@/lib/currency";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";
import { emailButton, getEmailBrand, wrapEmailLayout } from "@/lib/emailLayout";

/** Resend sandbox sender — works before a custom domain is verified. */
export const RESEND_SANDBOX_FROM = "CrazzyCars.pk <onboarding@resend.dev>";

/** Default staff inbox when Settings / env are empty. */
export const DEFAULT_ORDER_ADMIN_EMAIL = "ordersatall@gmail.com";

/** Resend-verified sender (use FROM_EMAIL env once domain is verified). */
export function getFromEmail() {
  const raw = String(process.env.FROM_EMAIL || "").trim();
  return raw || null;
}

/**
 * Sync helper — env only (tests / debug). Prefer resolveAdminOrderEmail() at runtime.
 */
export function getAdminEmail() {
  // Prefer ADMIN_EMAIL for order/staff alerts; CONTACT_EMAIL is used by the contact form.
  return (
    String(process.env.ADMIN_EMAIL || "").trim() ||
    String(process.env.CONTACT_EMAIL || "").trim() ||
    DEFAULT_ORDER_ADMIN_EMAIL
  );
}

/**
 * Resolve new-order admin inbox from Settings → env → default.
 * Respects notifications.emailOnNewOrder.
 */
export async function resolveAdminOrderEmail() {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("notifications")
        .lean()) || (await Settings.findOne({}).select("notifications").lean());
    const n = doc?.notifications || {};
    if (n.emailOnNewOrder === false) {
      return { enabled: false, email: "" };
    }
    const fromSettings = String(n.notificationEmail || "").trim().toLowerCase();
    if (fromSettings && fromSettings.includes("@")) {
      return { enabled: true, email: fromSettings };
    }
  } catch (e) {
    console.error("[email] resolveAdminOrderEmail settings:", e?.message || e);
  }
  return { enabled: true, email: getAdminEmail() };
}

/** True if this order already logged a successful email of the given type. */
export function orderHasEmailType(order, emailType) {
  const history = Array.isArray(order?.emailHistory) ? order.emailHistory : [];
  return history.some(
    (e) =>
      String(e?.type || "") === String(emailType) &&
      String(e?.status || "sent") !== "failed"
  );
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails disabled");
    return null;
  }
  return new Resend(apiKey);
}

function formatResendError(error) {
  if (!error) return "Unknown Resend error";
  if (typeof error === "string") return error;
  const msg = error.message || error.name || "Resend send failed";
  const bits = [msg];
  if (error.statusCode) bits.push(`status=${error.statusCode}`);
  if (error.name && error.name !== msg) bits.push(`name=${error.name}`);
  try {
    bits.push(`raw=${JSON.stringify(error)}`);
  } catch {
    /* ignore */
  }
  return bits.join(" | ");
}

function isUnverifiedSenderError(error) {
  const text = formatResendError(error).toLowerCase();
  return (
    text.includes("domain is not verified") ||
    text.includes("not verified") ||
    text.includes("invalid from") ||
    text.includes("from address") ||
    text.includes("validation_error")
  );
}

function buildSender(fromOverride) {
  const fromName = process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";
  const fromEmail = getFromEmail();
  if (fromOverride && String(fromOverride).trim()) return String(fromOverride).trim();
  if (!fromEmail) return null;
  if (fromEmail.includes("<") && fromEmail.includes(">")) return fromEmail;
  return `${fromName} <${fromEmail}>`;
}

/** Customer-facing Reply-To (never the interim/unbranded FROM host). */
export function getReplyToEmail() {
  const candidates = [
    process.env.REPLY_TO_EMAIL,
    process.env.CONTACT_EMAIL,
    "info@crazzycars.pk",
  ];
  for (const raw of candidates) {
    const v = String(raw || "").trim().toLowerCase();
    if (!v || !v.includes("@")) continue;
    if (v.includes("imedihelp") || v.includes("onboarding@resend.dev")) continue;
    return v;
  }
  return "info@crazzycars.pk";
}

/**
 * Send via Resend. If FROM_EMAIL uses an unverified custom domain, retries once
 * with Resend's sandbox sender (onboarding@resend.dev).
 */
export async function sendEmail({ to, subject, html, from, replyTo: replyToOverride }) {
  try {
    const resend = getResend();
    if (!resend) return { success: false, error: "Email not configured (RESEND_API_KEY missing)" };

    const recipients = Array.isArray(to) ? to : [to];
    if (!recipients.length || !recipients[0]) {
      return { success: false, error: "No recipient address" };
    }

    const primary = buildSender(from);
    const attempts = [];
    if (primary) attempts.push(primary);
    // Optional verified-domain FROM (same Resend account) when crazzycars.pk is not on this key.
    const verifiedFallback = String(process.env.RESEND_VERIFIED_FROM || "").trim();
    if (verifiedFallback) {
      const vf = verifiedFallback.includes("<")
        ? verifiedFallback
        : `${process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk"} <${verifiedFallback}>`;
      if (!attempts.includes(vf)) attempts.push(vf);
    }
    // Always allow sandbox fallback when primary is custom / missing.
    if (!primary || !primary.includes("onboarding@resend.dev")) {
      attempts.push(RESEND_SANDBOX_FROM);
    }

    const replyTo = String(replyToOverride || "").trim() || getReplyToEmail();

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
      const sender = attempts[i];
      const { data, error } = await resend.emails.send({
        from: sender,
        to: recipients,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });

      if (!error) {
        if (i > 0) {
          console.warn(
            `[email] Primary FROM failed; sent via sandbox fallback. from=${sender} id=${data?.id}`
          );
        }
        return {
          success: true,
          messageId: data?.id,
          from: sender,
          usedFallback: i > 0,
        };
      }

      lastError = error;
      const detail = formatResendError(error);
      console.error(`[email] Resend error (from=${sender}):`, detail);

      // Only retry when the failure looks like an unverified/invalid sender.
      if (i === 0 && attempts.length > 1 && isUnverifiedSenderError(error)) {
        continue;
      }
      // Also retry once for any first-attempt failure when we still have sandbox left
      // (covers empty/malformed FROM that Resend rejects differently).
      if (i === 0 && attempts.length > 1) continue;
      break;
    }

    return { success: false, error: formatResendError(lastError) };
  } catch (error) {
    const detail = error?.message || String(error);
    console.error("[email] Email send exception:", detail);
    return { success: false, error: detail };
  }
}

/** Send a test message to ADMIN_EMAIL / CONTACT_EMAIL (uses sendEmail + sandbox fallback). */
export async function sendTestEmail(toOverride) {
  const to = String(toOverride || "").trim() || getAdminEmail();
  const result = await sendEmail({
    to,
    subject: `${process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk"} - Email Test`,
    html: `<h1>Email test working!</h1><p>Sent at ${new Date().toISOString()}</p>`,
  });
  return { ...result, to };
}

/** Append to order.emailHistory after customer-facing sends (Mongo). */
export async function recordEmailSent(orderId, emailType, subject, to, resultStatus = "sent") {
  try {
    if (!orderId) return;
    await dbConnect();
    await Order.findByIdAndUpdate(String(orderId), {
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

function buildAdminOrderItemsRows(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    return `<tr><td colspan="3" style="padding:12px 8px;font-size:13px;color:#888;">No line items</td></tr>`;
  }
  return items
    .map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Number(item.unitPrice ?? item.price ?? 0) || 0;
      const lineTotal = unit * qty;
      const variation = item.variation || item.variant || item.option || "";
      const sku = item.sku || item.articleNo || "";
      return `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
        ${item.image ? `<img src="${item.image}" alt="" width="52" height="52" style="border-radius:4px;display:block;object-fit:cover;" />` : ""}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
        <p style="margin:0;font-size:14px;color:#111;font-weight:600;">${item.name || "Product"}</p>
        ${variation ? `<p style="margin:3px 0 0;font-size:12px;color:#888;">${variation}</p>` : ""}
        ${sku ? `<p style="margin:3px 0 0;font-size:11px;color:#aaa;">SKU: ${sku}</p>` : ""}
        <p style="margin:4px 0 0;font-size:12px;color:#555;">Qty: <strong>${qty}</strong> · ${formatPrice(unit)} each</p>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top;white-space:nowrap;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111;">${formatPrice(lineTotal)}</p>
      </td>
    </tr>`;
    })
    .join("");
}

export async function sendAdminOrderNotification(order) {
  const { enabled, email: adminEmail } = await resolveAdminOrderEmail();
  if (!enabled) {
    return { success: false, skipped: true, error: "Admin new-order email disabled in Settings" };
  }
  if (!adminEmail) {
    return { success: false, error: "No admin notification email configured" };
  }
  if (orderHasEmailType(order, "admin_new_order")) {
    return { success: true, skipped: true, error: "Admin already notified for this order" };
  }

  const storeName = process.env.FROM_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk"}`;
  const adminBase = String(process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.crazzycars.pk").replace(
    /\/$/,
    ""
  );
  const orderId = order?._id ? String(order._id) : "";
  const orderUrl = orderId ? `${adminBase}/orders/${orderId}` : `${adminBase}/orders`;
  const addr = order?.shippingAddress || {};
  const pricing = order?.pricing || {};
  const subtotal = Number(pricing.subtotal ?? order?.subtotal ?? 0) || 0;
  const shipping = Number(pricing.shippingCost ?? pricing.shipping ?? 0) || 0;
  const total = Number(pricing.total ?? order?.total ?? 0) || 0;
  const addressLine = [addr.street, addr.line1, addr.address, addr.area]
    .filter(Boolean)
    .join(", ");

  const brand = getEmailBrand({ storeName });
  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${brand.black};">New order received</h1>
    <p style="margin:0 0 20px;color:${brand.muted};font-size:14px;">
      A customer just placed an order on ${brand.storeName}. Open it in admin to confirm and book courier.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};">Order</td>
        <td style="padding:6px 0;font-size:14px;font-weight:700;color:${brand.black};text-align:right;">
          ${order.orderNumber || order._id}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};">Customer</td>
        <td style="padding:6px 0;font-size:14px;color:${brand.black};text-align:right;">
          ${order.customer?.name || addr.name || ""}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};">Phone</td>
        <td style="padding:6px 0;font-size:14px;color:${brand.black};text-align:right;">
          ${order.customer?.phone || addr.phone || ""}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};">Email</td>
        <td style="padding:6px 0;font-size:14px;color:${brand.black};text-align:right;">
          ${order.customer?.email || "—"}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};">Payment</td>
        <td style="padding:6px 0;font-size:14px;color:${brand.black};text-align:right;">
          ${order.paymentMethod || "N/A"} · ${order.paymentStatus || ""}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brand.muted};vertical-align:top;">Ship to</td>
        <td style="padding:6px 0;font-size:14px;color:${brand.black};text-align:right;">
          ${addressLine || "—"}<br/>
          ${[addr.city, addr.province || addr.state, addr.country].filter(Boolean).join(", ")}
        </td>
      </tr>
    </table>

    <h2 style="margin:24px 0 12px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${brand.muted};">
      Products
    </h2>
    <table style="width:100%;border-collapse:collapse;">
      ${buildAdminOrderItemsRows(order)}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:${brand.muted};">Subtotal</td>
        <td style="padding:4px 0;font-size:13px;color:${brand.black};text-align:right;">${formatPrice(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:${brand.muted};">Shipping</td>
        <td style="padding:4px 0;font-size:13px;color:${brand.black};text-align:right;">
          ${shipping === 0 ? "FREE" : formatPrice(shipping)}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:${brand.black};border-top:1px solid ${brand.border};">Grand Total</td>
        <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:${brand.black};text-align:right;border-top:1px solid ${brand.border};">
          ${formatPrice(total)}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin-top:28px;">
      ${emailButton(orderUrl, "View Order in Admin", { bg: brand.red })}
    </div>
  `;
  const html = wrapEmailLayout(inner, {
    storeName,
    eyebrow: "Staff alert · new order",
    preheader: `New order ${order.orderNumber || ""} · ${formatPrice(total)}`,
  });

  const subject = `New Order: ${order.orderNumber || order._id} - ${formatPrice(total)}`;
  const sent = await sendEmail({
    to: adminEmail,
    subject,
    html,
  });
  if (sent?.success && order?._id) {
    await recordEmailSent(order._id, "admin_new_order", subject, adminEmail);
  }
  return sent;
}

/**
 * Send customer order confirmation once per order (skips if already in emailHistory).
 */
export async function sendCustomerOrderConfirmation(order, { storeName, logoUrl } = {}) {
  const to = String(order?.customer?.email || "").trim().toLowerCase();
  if (!to || !to.includes("@") || to.includes("@guest.")) {
    return { success: false, skipped: true, error: "No customer email" };
  }
  if (orderHasEmailType(order, "order_confirmation")) {
    return { success: true, skipped: true, error: "Confirmation already sent" };
  }
  const templates = await loadEmailTemplates();
  if (String(templates?.orderConfirmation?.body || "").trim()) {
    const { loadEmailRuntimeSettings, sendTemplatedCustomerEmail } = await import(
      "@/lib/customerLifecycleEmail"
    );
    return sendTemplatedCustomerEmail(order, "orderConfirmation", await loadEmailRuntimeSettings());
  }
  const name =
    storeName || process.env.FROM_NAME || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";
  const { subject, html } = await resolveOrderConfirmationEmail(order, name, logoUrl || "");
  const sent = await sendEmail({ to, subject, html });
  if (sent?.success && order?._id) {
    await recordEmailSent(order._id, "order_confirmation", subject, to);
  }
  return sent;
}

function applyTemplateVars(str, vars = {}) {
  if (!str || typeof str !== "string") return str || "";
  let out = str;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(value ?? ""));
  }
  return out;
}

export async function loadEmailTemplates() {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    return doc?.emailTemplates || {};
  } catch {
    return {};
  }
}

async function loadStoreContactForEmail() {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    return {
      pakistaniPaymentMethods: doc?.pakistaniPaymentMethods,
      whatsapp: doc?.whatsapp,
    };
  } catch {
    return { pakistaniPaymentMethods: null, whatsapp: null };
  }
}

/** COD + paid shipping: optional advance payment of delivery charges. */
export function buildCodDeliveryChargeEmailSection(order, contact = {}) {
  const pm = String(order.paymentMethod || "").toLowerCase();
  if (pm !== "cod") return "";
  const shipping = Math.max(0, Number(order.pricing?.shippingCost) || 0);
  if (shipping <= 0) return "";

  const methods = normalizePakistaniPaymentMethods(contact.pakistaniPaymentMethods);
  const jazz = methods.jazzcash;
  const easy = methods.easypaisa;
  const jazzOn = jazz?.enabled && String(jazz.accountNumber || "").trim();
  const easyOn = easy?.enabled && String(easy.accountNumber || "").trim();
  if (!jazzOn && !easyOn) return "";

  const wa = contact.whatsapp || {};
  const waNum = String(wa.number || process.env.NEXT_PUBLIC_WHATSAPP || "").trim();

  const lines = [];
  if (jazzOn) lines.push(`<li>JazzCash: <strong>${jazz.accountNumber}</strong></li>`);
  if (easyOn) lines.push(`<li>Easypaisa: <strong>${easy.accountNumber}</strong></li>`);
  if (waNum) lines.push(`<li>Send screenshot to WhatsApp: <strong>${waNum}</strong></li>`);

  return `
    <div style="margin-top:24px;padding:16px 20px;background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:8px;font-size:14px;color:#374151;line-height:1.7;">
      <p style="margin:0 0 12px;font-weight:700;color:#92400E;">📦 COD booking advance</p>
      <p style="margin:0 0 12px;">Your booking / delivery amount due now: <strong>${formatPrice(shipping)}</strong></p>
      <p style="margin:0 0 8px;">To confirm your COD order, pay the booking advance and send the screenshot:</p>
      <ul style="margin:0 0 12px;padding-left:20px;">${lines.join("")}</ul>
      <p style="margin:0;font-size:13px;color:#6B7280;">
        The booking amount is deducted from your total; the remaining balance is collected on delivery.
      </p>
    </div>
  `;
}

/** Subject + HTML for order confirmation, using admin templates when set. */
export async function resolveOrderConfirmationEmail(order, storeName, logoUrl) {
  const templates = await loadEmailTemplates();
  const contact = await loadStoreContactForEmail();
  const tpl = templates.orderConfirmation || {};
  const vars = {
    customer_name: order.customer?.name || "Customer",
    order_id: order.orderNumber || order._id,
    total: formatPrice(order.pricing?.total || order.total || 0),
    store_name: storeName || process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk",
    tracking_link: order.tracking?.url || "",
  };
  const subject =
    applyTemplateVars(tpl.subject?.trim(), vars) ||
    `Order Confirmed - ${order.orderNumber} | ${vars.store_name}`;
  const customBody = tpl.body?.trim();
  const html = customBody
    ? applyTemplateVars(customBody, vars)
    : buildOrderConfirmationEmail(order, storeName, logoUrl, contact);
  return { subject, html };
}

export async function resolvePasswordResetEmail(vars = {}) {
  const templates = await loadEmailTemplates();
  const tpl = templates.passwordReset || {};
  const subject =
    applyTemplateVars(tpl.subject?.trim(), vars) || `Reset your password | ${vars.store_name || "Store"}`;
  const html =
    applyTemplateVars(tpl.body?.trim(), vars) ||
    `<p>Click <a href="${vars.reset_link || "#"}">here</a> to reset your password.</p>`;
  return { subject, html };
}

export function buildOrderConfirmationEmail(order, storeName, logoUrl, contact = {}) {
  const brand = getEmailBrand({
    storeName: storeName || undefined,
    logoUrl: logoUrl || undefined,
  });
  const codDeliverySection = buildCodDeliveryChargeEmailSection(order, contact);

  const items =
    order.items
      ?.map(
        (item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid ${brand.border};">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" width="56" style="border-radius:4px;display:block;" />` : ""}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid ${brand.border};">
        <p style="margin:0;font-size:14px;color:${brand.black};font-weight:600;">
          ${item.name}
        </p>
        ${item.variation ? `<p style="margin:3px 0 0;font-size:12px;color:${brand.muted};">${item.variation}</p>` : ""}
        <p style="margin:3px 0 0;font-size:12px;color:${brand.muted};">Qty: ${item.quantity}</p>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid ${brand.border};text-align:right;">
        <p style="margin:0;font-size:14px;font-weight:700;color:${brand.black};">
          ${formatPrice((item.unitPrice || item.price || 0) * item.quantity)}
        </p>
      </td>
    </tr>`
      )
      .join("") || "";

  const addr = order.shippingAddress;
  const inner = `
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:18px 16px;text-align:center;margin:0 0 22px;">
      <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#047857;font-weight:700;">Order confirmed</p>
      <h1 style="margin:0 0 6px;font-size:22px;color:#065F46;">Thank you, ${order.customer?.name || "there"}!</h1>
      <p style="margin:0;font-size:14px;color:#047857;">
        We received your order and will prepare it for delivery.
      </p>
    </div>

    <div style="background:${brand.card};border:1px solid ${brand.border};border-radius:8px;padding:16px 18px;margin:0 0 22px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:13px;color:${brand.muted};padding:4px 0;">Order Reference</td>
          <td style="font-size:13px;font-weight:700;color:${brand.black};text-align:right;padding:4px 0;">
            ${order.orderNumber || order._id}
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${brand.muted};padding:4px 0;">Date</td>
          <td style="font-size:13px;color:${brand.black};text-align:right;padding:4px 0;">
            ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${brand.muted};padding:4px 0;">Payment</td>
          <td style="font-size:13px;color:${brand.black};text-align:right;padding:4px 0;">
            ${order.paymentMethod || "N/A"}
          </td>
        </tr>
      </table>
    </div>

    <h3 style="font-size:12px;font-weight:700;color:${brand.muted};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">
      Your order
    </h3>
    <table style="width:100%;border-collapse:collapse;">
      ${items}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="font-size:13px;color:${brand.muted};padding:4px 0;">Subtotal</td>
        <td style="font-size:13px;color:${brand.black};text-align:right;padding:4px 0;">
          ${formatPrice(order.pricing?.subtotal || 0)}
        </td>
      </tr>
      ${
        order.pricing?.discount > 0
          ? `<tr>
        <td style="font-size:13px;color:#16a34a;padding:4px 0;">Discount</td>
        <td style="font-size:13px;color:#16a34a;text-align:right;padding:4px 0;">
          -${formatPrice(order.pricing.discount)}
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="font-size:13px;color:${brand.muted};padding:4px 0;">Shipping</td>
        <td style="font-size:13px;color:${brand.black};text-align:right;padding:4px 0;">
          ${formatPrice(order.pricing?.shippingCost || 0)}
        </td>
      </tr>
    </table>
    <div style="border-top:2px solid ${brand.black};padding-top:14px;margin-top:8px;text-align:right;">
      <p style="font-size:18px;font-weight:700;color:${brand.black};margin:0;">
        Total: ${formatPrice(order.pricing?.total || 0)}
      </p>
    </div>

    ${
      addr
        ? `<div style="margin-top:22px;padding:16px 18px;background:${brand.card};border:1px solid ${brand.border};border-radius:8px;">
      <h3 style="font-size:12px;font-weight:700;color:${brand.muted};margin:0 0 10px;text-transform:uppercase;letter-spacing:0.08em;">
        Shipping to
      </h3>
      <p style="font-size:13px;color:#374151;margin:0;line-height:1.8;">
        ${addr.name || ""}<br>
        ${addr.street || ""}<br>
        ${addr.city || ""}${addr.state ? `, ${addr.state}` : ""} ${addr.zip || ""}<br>
        ${addr.country || ""}
      </p>
    </div>`
        : ""
    }

    ${codDeliverySection}

    <div style="text-align:center;margin-top:28px;">
      ${emailButton(`${brand.siteUrl}/shop`, "Continue Shopping")}
    </div>
  `;

  return wrapEmailLayout(inner, {
    storeName: brand.storeName,
    logoUrl: brand.logoUrl,
    eyebrow: "Order confirmation",
    preheader: `Order ${order.orderNumber || ""} confirmed · ${formatPrice(order.pricing?.total || 0)}`,
  });
}

export function buildShippingEmail(order, storeName, logoUrl) {
  const brand = getEmailBrand({
    storeName: storeName || undefined,
    logoUrl: logoUrl || undefined,
  });
  const trackingNumber = order.tracking?.number || order.trackingNumber || "";
  const trackingUrl =
    order.tracking?.url ||
    (trackingNumber ? `${brand.trackUrl}?tracking=${encodeURIComponent(trackingNumber)}` : brand.trackUrl);

  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${brand.black};">
      Great news, ${order.customer?.name || "there"}!
    </h1>
    <p style="margin:0 0 20px;color:${brand.muted};font-size:15px;">
      Your order <strong style="color:${brand.black};">${order.orderNumber}</strong> is on its way.
    </p>
    ${
      trackingNumber
        ? `<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:22px;text-align:center;margin:0 0 20px;">
      <p style="color:${brand.muted};margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Tracking number</p>
      <p style="font-size:22px;font-weight:700;color:${brand.black};margin:0;">${trackingNumber}</p>
      <p style="color:${brand.muted};margin:6px 0 0;font-size:13px;">${order.tracking?.carrier || order.courier || "Courier"}</p>
      <div style="margin-top:16px;">${emailButton(trackingUrl, "Track your package")}</div>
    </div>`
        : ""
    }
    <p style="margin:0;color:${brand.muted};font-size:14px;">Thank you for shopping with ${brand.storeName}.</p>
  `;

  return wrapEmailLayout(inner, {
    storeName: brand.storeName,
    logoUrl: brand.logoUrl,
    eyebrow: "Shipping update",
    preheader: `Order ${order.orderNumber || ""} shipped${trackingNumber ? ` · ${trackingNumber}` : ""}`,
  });
}
