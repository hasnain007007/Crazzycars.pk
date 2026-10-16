/**
 * Signed post-delivery review links for WhatsApp (storefront /review/[orderId]).
 * Keep in sync with storecraft-store/lib/reviewRequestToken.js
 */
import crypto from "node:crypto";

const TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function secret() {
  return process.env.WA_ACTION_SECRET || process.env.JWT_SECRET || "";
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
  return `${origin}/review/${orderId}?t=${encodeURIComponent(token)}`;
}

export function buildReviewRequestWhatsAppMessage(order, reviewUrl) {
  const name =
    [order?.customer?.firstName, order?.customer?.lastName].filter(Boolean).join(" ").trim() ||
    order?.customer?.name ||
    "there";
  const orderNum = order?.orderNumber || order?.id || order?._id || "";
  return `Assalam o Alaikum ${name}!

Shukriya for your Crazzycars.pk order #${orderNum} 🚗

How was the product & delivery? Tap below to leave a quick star rating (takes 30 seconds):

⭐ ${reviewUrl}

Your honest review helps other Pakistani car owners — and helps us improve.

Crazzycars.pk`;
}
