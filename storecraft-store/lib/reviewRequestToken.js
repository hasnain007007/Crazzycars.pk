/**
 * Signed post-delivery review links (WhatsApp → storefront).
 * Opaque URL: /review/<token> — no PII; payload is orderId + expiry (HMAC).
 */
import crypto from "node:crypto";

const TTL_SEC = 60 * 60 * 24 * 60; // 60 days

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

/**
 * Verify opaque token. Optionally assert orderId when known (legacy ?t= links).
 * @returns {{ ok: true, orderId: string } | { ok: false, error: string }}
 */
export function verifyReviewRequestToken(token, expectedOrderId = null) {
  const key = secret();
  if (!key || !token) return { ok: false, error: "Invalid link." };
  try {
    const raw = Buffer.from(String(token), "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 4) return { ok: false, error: "Invalid link." };
    const [id, act, expStr, sig] = parts;
    if (act !== "review") return { ok: false, error: "Invalid link." };
    if (expectedOrderId != null && String(expectedOrderId) !== String(id)) {
      return { ok: false, error: "Link does not match this order." };
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, error: "This review link has expired." };
    }
    const payload = `${id}.${act}.${exp}`;
    const expected = crypto.createHmac("sha256", key).update(payload).digest("hex").slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid signature." };
    }
    return { ok: true, orderId: String(id) };
  } catch {
    return { ok: false, error: "Invalid link." };
  }
}

export function buildReviewRequestUrl(baseUrl, orderId) {
  const token = signReviewRequestToken(orderId);
  if (!token || !baseUrl || !orderId) return "";
  const base = String(baseUrl).replace(/\/$/, "");
  return `${base}/review/${encodeURIComponent(token)}`;
}
