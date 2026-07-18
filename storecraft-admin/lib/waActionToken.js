/**
 * Signed one-tap confirm/cancel links for admin WhatsApp alerts (no Business API poll).
 */
import crypto from "node:crypto";

const TTL_SEC = 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.JWT_SECRET || process.env.WA_ACTION_SECRET || "";
}

export function signWaActionToken(orderId, action) {
  const key = secret();
  if (!key || !orderId || !action) return "";
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${orderId}.${action}.${exp}`;
  const sig = crypto.createHmac("sha256", key).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyWaActionToken(token, orderId, action) {
  const key = secret();
  if (!key || !token) return { ok: false, error: "Invalid link." };
  try {
    const raw = Buffer.from(String(token), "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 4) return { ok: false, error: "Invalid link." };
    const [id, act, expStr, sig] = parts;
    if (id !== String(orderId) || act !== String(action)) {
      return { ok: false, error: "Link does not match this order." };
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, error: "This link has expired." };
    }
    const payload = `${id}.${act}.${exp}`;
    const expected = crypto.createHmac("sha256", key).update(payload).digest("hex").slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid signature." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid link." };
  }
}

export function buildWaActionUrl(baseUrl, orderId, action) {
  const token = signWaActionToken(orderId, action);
  if (!token || !baseUrl || !orderId) return "";
  const base = String(baseUrl).replace(/\/$/, "");
  return `${base}/api/orders/${orderId}/wa-action?action=${encodeURIComponent(action)}&t=${encodeURIComponent(token)}`;
}
