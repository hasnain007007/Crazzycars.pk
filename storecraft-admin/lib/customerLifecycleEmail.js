/**
 * Customer lifecycle emails: resolve templates, send, record history.
 */
import { formatAdminPrice } from "@/lib/currency";
import { dbConnect } from "@/lib/db";
import { recordEmailSent, sendEmail } from "@/lib/email";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import {
  applyTemplateVars,
  DEFAULT_EMAIL_TEMPLATES,
  isSendableCustomerEmail,
  planOrderLifecycleEmails,
} from "@/lib/orderEmailPlan";

function storeNameFrom(settings) {
  return (
    String(settings?.general?.storeName || "").trim() ||
    process.env.FROM_NAME ||
    process.env.NEXT_PUBLIC_STORE_NAME ||
    "Crazzycars.pk"
  );
}

function splitCustomerName(order) {
  const first = String(order?.customer?.firstName || "").trim();
  const last = String(order?.customer?.lastName || "").trim();
  if (first || last) return { first: first || "Customer", last };
  const full = String(order?.customer?.name || "").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return { first: parts[0] || "Customer", last: parts.slice(1).join(" ") };
}

function formatWhen(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}

function itemsHtml(order, formatPrice) {
  const rows = Array.isArray(order?.items) ? order.items : [];
  if (!rows.length) return "<p>No items</p>";
  const body = rows
    .map((item) => {
      const name = String(item.name || "Item");
      const qty = Number(item.quantity) || 1;
      const line = formatPrice((Number(item.unitPrice || item.price) || 0) * qty);
      const variation = item.variation ? ` (${item.variation})` : "";
      return `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${name}${variation} × ${qty}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${line}</td></tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${body}</table>`;
}

function companyAddress(settings) {
  const a = settings?.general?.address || {};
  return [a.street, a.city, a.country].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
}

export function buildOrderEmailVars(order, settings = {}, extra = {}, formatPrice = formatAdminPrice) {
  const name = splitCustomerName(order);
  const store = storeNameFrom(settings);
  const trackingNumber = String(order?.trackingNumber || order?.tracking?.number || "").trim();
  const trackingLink = String(order?.tracking?.url || order?.trackingUrl || "").trim();
  const subtotal = Number(order?.pricing?.subtotal ?? order?.subtotal) || 0;
  const shipping = Number(order?.pricing?.shippingCost ?? order?.shippingCost) || 0;
  const total = Number(order?.pricing?.total ?? order?.total) || 0;
  return {
    customer_name: [name.first, name.last].filter(Boolean).join(" "),
    "customer.first_name": name.first,
    "customer.last_name": name.last,
    "customer.email": String(order?.customer?.email || extra.email || "").trim(),
    order_id: String(order?.orderNumber || order?._id || ""),
    order_datetime: formatWhen(order?.createdAt),
    order_status: String(order?.orderStatus || ""),
    payment_status: String(order?.paymentStatus || ""),
    order_items: itemsHtml(order, formatPrice),
    subtotal: formatPrice(subtotal),
    order_shipping: formatPrice(shipping),
    order_total: formatPrice(total),
    total: formatPrice(total),
    tracking_number: trackingNumber,
    tracking_link: trackingLink,
    courier: String(order?.tracking?.carrier || order?.courier || "Postex"),
    "company.name": store,
    "company.address": companyAddress(settings),
    store_name: store,
    reset_link: extra.reset_link || "",
    ...extra,
  };
}

function wrapLayout(store, inner) {
  if (/<html/i.test(inner)) return inner;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8f8f8;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff">
    <div style="background:#111;padding:20px 28px;text-align:center">
      <p style="color:#D72323;letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin:0">${store}</p>
    </div>
    <div style="padding:28px;font-size:15px;line-height:1.6;color:#222">${inner}</div>
    <div style="background:#111;padding:16px 28px;text-align:center">
      <p style="color:rgba(255,255,255,.5);font-size:11px;margin:0">&copy; ${new Date().getFullYear()} ${store}</p>
    </div>
  </div></body></html>`;
}

export async function loadEmailRuntimeSettings() {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    return doc || {};
  } catch {
    return {};
  }
}

function alreadySent(order, historyType) {
  if (!historyType) return false;
  const history = Array.isArray(order?.emailHistory) ? order.emailHistory : [];
  return history.some(
    (row) => String(row?.type || "") === String(historyType) && String(row?.status || "sent") !== "failed"
  );
}

function rememberSent(order, historyType, subject, to) {
  if (!order || !historyType) return;
  if (!Array.isArray(order.emailHistory)) order.emailHistory = [];
  order.emailHistory.push({ type: historyType, subject, to, sentAt: new Date(), status: "sent" });
}

export function resolveTemplatedEmail(templateKey, order, settings, extra = {}) {
  const defaults = DEFAULT_EMAIL_TEMPLATES[templateKey] || { subject: "", body: "" };
  const tpl = settings?.emailTemplates?.[templateKey] || {};
  const vars = buildOrderEmailVars(order, settings, extra);
  const subject =
    applyTemplateVars(String(tpl.subject || "").trim() || defaults.subject, vars) ||
    `${vars.store_name}`;
  const rawBody = String(tpl.body || "").trim() || defaults.body;
  const html = wrapLayout(vars.store_name, applyTemplateVars(rawBody, vars));
  return { subject, html, vars };
}

const HISTORY_BY_KEY = {
  orderConfirmation: "order_confirmation",
  orderPaymentReceived: "payment_received",
  orderShipped: "shipping_notification",
  orderDelivered: "order_delivered",
  orderCancelled: "order_cancelled",
  orderStatusUpdate: "order_status_update",
};

export async function sendTemplatedCustomerEmail(order, templateKey, settings, { force = false, extra } = {}) {
  const to = String(order?.customer?.email || extra?.email || "").trim().toLowerCase();
  if (!isSendableCustomerEmail(to)) {
    return { success: false, skipped: true, error: "No customer email" };
  }
  const historyType = HISTORY_BY_KEY[templateKey];
  if (!force && alreadySent(order, historyType)) {
    return { success: true, skipped: true, error: "Already sent" };
  }
  const runtime = settings && Object.keys(settings).length ? settings : await loadEmailRuntimeSettings();
  const { subject, html } = resolveTemplatedEmail(templateKey, order, runtime, extra);
  const sent = await sendEmail({ to, subject, html });
  if (sent?.success && order?._id && historyType) {
    await recordEmailSent(order._id, historyType, subject, to);
    rememberSent(order, historyType, subject, to);
  }
  return sent;
}

export async function dispatchOrderLifecycleEmails(order, change = {}, options = {}) {
  if (!order) return [];
  const settings = options.settings || (await loadEmailRuntimeSettings());
  const jobs =
    options.jobs ||
    planOrderLifecycleEmails({
      prevStatus: change.prevStatus,
      nextStatus: change.nextStatus ?? order.orderStatus,
      prevPayment: change.prevPayment,
      nextPayment: change.nextPayment ?? order.paymentStatus,
      prevTracking: change.prevTracking,
      nextTracking: change.nextTracking ?? String(order.trackingNumber || order.tracking?.number || ""),
      paymentMethod: order.paymentMethod,
      notifications: settings.notifications,
      sendTrackingToCustomer: settings.courier?.sendTrackingToCustomer,
    });
  const out = [];
  for (const key of jobs) {
    try {
      out.push(await sendTemplatedCustomerEmail(order, key, settings, options));
    } catch (err) {
      console.error(`[email] ${key} failed:`, err?.message || err);
      out.push({ success: false, error: err?.message || String(err) });
    }
  }
  return out;
}

export async function sendCustomerWelcomeEmail({ firstName, lastName, email, name } = {}) {
  const settings = await loadEmailRuntimeSettings();
  if (settings?.notifications?.emailOnCustomerWelcome === false) {
    return { success: true, skipped: true };
  }
  return sendTemplatedCustomerEmail(
    { customer: { firstName, lastName, name, email } },
    "customerWelcome",
    settings,
    { extra: { email } }
  );
}

export async function sendPasswordResetEmail({ firstName, lastName, name, email, reset_link } = {}) {
  const settings = await loadEmailRuntimeSettings();
  return sendTemplatedCustomerEmail(
    { customer: { firstName, lastName, name, email } },
    "passwordReset",
    settings,
    { force: true, extra: { email, reset_link } }
  );
}
