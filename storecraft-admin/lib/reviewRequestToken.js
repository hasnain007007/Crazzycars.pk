/**
 * Signed post-delivery review links for WhatsApp.
 * Keep in sync with storecraft-store/lib/reviewRequestToken.js
 * Opaque URL: /review/<token> — no PII; payload is orderId + expiry (HMAC).
 */
import crypto from "node:crypto";

const TTL_SEC = 60 * 60 * 24 * 60; // 60 days

export const DEFAULT_REVIEW_REQUEST_WHATSAPP_TEMPLATE =
  "Assalam o Alaikum {firstName}! Your CrazzyCars.pk order #{orderNo} was delivered. How do you like it? Please rate it here (1 minute): {reviewUrl} — your honest feedback, good or bad, helps other buyers in Pakistan. Shukriya! WhatsApp: 0328 4010007";

function secret() {
  return (
    process.env.REVIEW_TOKEN_SECRET ||
    process.env.WA_ACTION_SECRET ||
    process.env.JWT_SECRET ||
    ""
  );
}

export function signReviewRequestToken(orderId) {
  const key = secret();
  if (!key || !orderId) return "";
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${orderId}.review.${exp}`;
  const sig = crypto.createHmac("sha256", key).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function buildReviewRequestUrl(baseUrl, orderId) {
  const token = signReviewRequestToken(orderId);
  if (!token || !baseUrl || !orderId) return "";
  const base = String(baseUrl).replace(/\/$/, "");
  // Storefront host — never admin.crazzycars.pk
  const storeBase =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    "https://crazzycars.pk";
  const origin = /admin\.|localhost:3[0-9]{3}/i.test(base) ? storeBase.replace(/\/$/, "") : base;
  return `${origin}/review/${encodeURIComponent(token)}`;
}

function firstNameFromOrder(order) {
  const c = order?.customer || {};
  const addr = order?.shippingAddress || {};
  const first = String(c.firstName || "").trim();
  if (first) return first;
  const full =
    String(addr.name || "").trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    String(c.name || "").trim();
  if (!full) return "there";
  return full.split(/\s+/)[0] || "there";
}

/**
 * Fill the editable review-request WhatsApp template.
 * Placeholders: {firstName}, {orderNo}, {reviewUrl} (also {orderNumber}, {customerName}).
 */
export function buildReviewRequestWhatsAppMessage(order, reviewUrl, template) {
  const firstName = firstNameFromOrder(order);
  const orderNo = String(order?.orderNumber || order?.id || order?._id || "").trim();
  const tpl = String(template || "").trim() || DEFAULT_REVIEW_REQUEST_WHATSAPP_TEMPLATE;
  return tpl
    .replaceAll("{firstName}", firstName)
    .replaceAll("{customerName}", firstName)
    .replaceAll("{orderNo}", orderNo)
    .replaceAll("{orderNumber}", orderNo)
    .replaceAll("{reviewUrl}", String(reviewUrl || ""));
}
