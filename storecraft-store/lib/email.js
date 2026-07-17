import { Resend } from "resend";
import { formatPrice } from "@/lib/currency";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";

/** Resend-verified sender (use FROM_EMAIL env once domain is verified). */
export function getFromEmail() {
  return process.env.FROM_EMAIL;
}

/** Admin inbox for order alerts and test emails. */
export function getAdminEmail() {
  return process.env.ADMIN_EMAIL || "delivered@resend.dev";
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — emails disabled");
    return null;
  }
  return new Resend(apiKey);
}

export async function sendEmail({ to, subject, html, from }) {
  const fromName = process.env.FROM_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
  const fromEmail = process.env.FROM_EMAIL;
  const sender = from || `${fromName} <${fromEmail}>`;
  try {
    const resend = getResend();
    if (!resend) return { success: false, error: "Email not configured" };
    const { data, error } = await resend.emails.send({
      from: sender,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

/** Send a test message to ADMIN_EMAIL using FROM_EMAIL. */
export async function sendTestEmail() {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not set" };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: getAdminEmail(),
    subject: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} - Email Test`,
    html: "<h1>Email test working!</h1>",
  });

  if (error) {
    console.error("Resend test email error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.id, to: getAdminEmail() };
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

export async function sendAdminOrderNotification(order) {
  const adminEmail = getAdminEmail();
  const storeName = process.env.FROM_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="margin:0;padding:0;background:#f8f8f8;font-family:'DM Sans',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#111111;padding:24px 40px;text-align:center;">
          <h1 style="color:#D72323;margin:0;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;">
            New Order Received
          </h1>
        </div>
        <div style="padding:28px 40px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">Order</td>
              <td style="padding:6px 0;font-size:14px;font-weight:700;color:#111;text-align:right;">
                ${order.orderNumber || order._id}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">Customer</td>
              <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">
                ${order.customer?.name || ""}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">Email</td>
              <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">
                ${order.customer?.email || ""}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">Total</td>
              <td style="padding:6px 0;font-size:16px;font-weight:700;color:#111;text-align:right;">
                ${formatPrice(order.pricing?.total || order.total || 0)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">Payment</td>
              <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">
                ${order.paymentMethod || "N/A"}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#888;">City</td>
              <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">
                ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.country || ""}
              </td>
            </tr>
          </table>
          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL}/orders"
              style="display:inline-block;padding:12px 28px;background:#009688;color:#fff;text-decoration:none;font-weight:700;border-radius:6px;font-size:13px;">
              View Order in Admin
            </a>
          </div>
        </div>
        <div style="background:#111111;padding:16px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
            &copy; ${new Date().getFullYear()} ${storeName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Order: ${order.orderNumber || order._id} - ${formatPrice(order.pricing?.total || order.total || 0)}`,
    html,
  });
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
      <p style="margin:0 0 12px;font-weight:700;color:#92400E;">📦 Delivery Charges Information</p>
      <p style="margin:0 0 12px;">Your delivery charge is: <strong>${formatPrice(shipping)}</strong></p>
      <p style="margin:0 0 8px;">To confirm your order faster, you can send the delivery charges in advance:</p>
      <ul style="margin:0 0 12px;padding-left:20px;">${lines.join("")}</ul>
      <p style="margin:0;font-size:13px;color:#6B7280;">
        Note: This is optional. You can also pay the full amount (product + delivery) when your order arrives.
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
    store_name: storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
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
  const sName = storeName || process.env.FROM_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
  const codDeliverySection = buildCodDeliveryChargeEmailSection(order, contact);

  const items =
    order.items
      ?.map(
        (item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" width="56" style="border-radius:4px;display:block;" />` : ""}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#111111;font-weight:600;">
          ${item.name}
        </p>
        ${item.variation ? `<p style="margin:3px 0 0;font-size:12px;color:#888;">${item.variation}</p>` : ""}
        <p style="margin:3px 0 0;font-size:12px;color:#888;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111111;">
          ${formatPrice((item.unitPrice || item.price || 0) * item.quantity)}
        </p>
      </td>
    </tr>`
      )
      .join("") || "";

  const addr = order.shippingAddress;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
      <title>Order Confirmed - ${sName}</title>
    </head>
    <body style="margin:0;padding:0;background:#f8f8f8;font-family:'DM Sans',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;">

        <!-- Header -->
        <div style="background:#111111;padding:32px 40px;text-align:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${sName}" style="max-height:50px;object-fit:contain;margin-bottom:8px;" /><br>` : ""}
          <h1 style="color:#D72323;font-size:24px;margin:0;letter-spacing:0.15em;text-transform:uppercase;">
            ${sName}
          </h1>
          <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:4px 0 0;letter-spacing:0.1em;text-transform:uppercase;">
            Premium car accessories
          </p>
        </div>

        <!-- Success banner -->
        <div style="background:#f0fdf4;padding:24px 40px;text-align:center;border-bottom:1px solid #bbf7d0;">
          <p style="font-size:32px;margin:0 0 8px;">&#10003;</p>
          <h2 style="color:#166534;font-size:20px;margin:0 0 4px;">Order Confirmed!</h2>
          <p style="color:#16a34a;font-size:14px;margin:0;">
            Thank you for shopping at Crazzycars.pk. We will deliver to your doorstep.
          </p>
        </div>

        <!-- Order details -->
        <div style="padding:32px 40px;">

          <div style="background:#f8f8f8;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="font-size:13px;color:#888;padding:4px 0;">Order Reference</td>
                <td style="font-size:13px;font-weight:700;color:#111;text-align:right;padding:4px 0;">
                  ${order.orderNumber || order._id}
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#888;padding:4px 0;">Date</td>
                <td style="font-size:13px;color:#111;text-align:right;padding:4px 0;">
                  ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#888;padding:4px 0;">Payment</td>
                <td style="font-size:13px;color:#111;text-align:right;padding:4px 0;">
                  ${order.paymentMethod || "N/A"}
                </td>
              </tr>
            </table>
          </div>

          <!-- Items -->
          <h3 style="font-size:14px;font-weight:700;color:#111;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.06em;">
            Your Order
          </h3>
          <table style="width:100%;border-collapse:collapse;">
            ${items}
          </table>

          <!-- Totals -->
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr>
              <td style="font-size:13px;color:#888;padding:4px 0;">Subtotal</td>
              <td style="font-size:13px;color:#111;text-align:right;padding:4px 0;">
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
              <td style="font-size:13px;color:#888;padding:4px 0;">Shipping</td>
              <td style="font-size:13px;color:#111;text-align:right;padding:4px 0;">
                ${formatPrice(order.pricing?.shippingCost || 0)}
              </td>
            </tr>
          </table>
          <div style="border-top:2px solid #111111;padding-top:16px;margin-top:8px;text-align:right;">
            <p style="font-size:18px;font-weight:700;color:#111111;margin:0;">
              Total: ${formatPrice(order.pricing?.total || 0)}
            </p>
          </div>

          <!-- Shipping address -->
          ${
            addr
              ? `<div style="margin-top:24px;padding:20px;background:#f8f8f8;border-radius:8px;">
            <h3 style="font-size:13px;font-weight:700;color:#111;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em;">
              Shipping To
            </h3>
            <p style="font-size:13px;color:#555;margin:0;line-height:1.8;">
              ${addr.name || ""}<br>
              ${addr.street || ""}<br>
              ${addr.city || ""}${addr.state ? `, ${addr.state}` : ""} ${addr.zip || ""}<br>
              ${addr.country || ""}${addr.nif ? `<br>NIF: ${addr.nif}` : ""}
            </p>
          </div>`
              : ""
          }

          ${codDeliverySection}

          <!-- CTA -->
          <div style="text-align:center;margin-top:32px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL}/products"
              style="display:inline-block;padding:14px 36px;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:2px;">
              Continue Shopping
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#111111;padding:24px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;line-height:1.8;">
            ${sName} &mdash; Premium car accessories<br>
            If you have any questions, contact us at ${process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || ""}<br>
            &copy; ${new Date().getFullYear()} ${sName}. All rights reserved.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

export function buildShippingEmail(order, storeName, logoUrl) {
  const sName = storeName || process.env.FROM_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="margin:0;padding:0;background:#f8f8f8;font-family:'DM Sans',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#111111;padding:32px 40px;text-align:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${sName}" style="max-height:50px;margin-bottom:8px;" /><br>` : ""}
          <h1 style="color:#D72323;font-size:24px;margin:0;letter-spacing:0.15em;text-transform:uppercase;">
            ${sName}
          </h1>
          <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:4px 0 0;letter-spacing:0.1em;">
            Your Order Has Shipped!
          </p>
        </div>
        <div style="padding:32px 40px;">
          <h2 style="color:#111;font-size:20px;margin:0 0 8px;">
            Great news, ${order.customer?.name || "Customer"}!
          </h2>
          <p style="color:#555;font-size:14px;margin:0 0 20px;">
            Your order <strong>${order.orderNumber}</strong> has been shipped.
          </p>
          ${
            order.tracking?.number
              ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:24px;text-align:center;margin-bottom:20px;">
            <p style="color:#888;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Tracking Number</p>
            <p style="font-size:22px;font-weight:700;color:#111;margin:0;">${order.tracking.number}</p>
            <p style="color:#888;margin:4px 0 0;font-size:13px;">${order.tracking.carrier || "Courier"}</p>
            ${
              order.tracking.url
                ? `<a href="${order.tracking.url}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#111111;color:#fff;text-decoration:none;font-weight:700;border-radius:2px;font-size:13px;letter-spacing:0.06em;">
              Track Your Package
            </a>`
                : ""
            }
          </div>`
              : ""
          }
          <p style="color:#555;font-size:14px;">Thank you for shopping with us!</p>
        </div>
        <div style="background:#111111;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
            &copy; ${new Date().getFullYear()} ${sName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
