/**
 * Postex status-update webhook helpers.
 * Payload shape (merchant portal / webhook guide):
 *   trackingNumber, orderReferenceNumber, statusUpdateDatetime, orderStatus
 * Status vocabulary from PostEx COD API Integration Guide V4.1.9 §3.15.
 */
import crypto from "node:crypto";
import {
  getOrderShippedWhatsAppMessage,
} from "@/lib/whatsappTemplates";
import { storefrontTrackingUrl } from "@/lib/postex";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

export const POSTEX_WEBHOOK_HEADER = "x-webhook-secret";
export const RAW_PAYLOAD_LOG_LIMIT = 20;

/** Only this Postex status maps to delivered (+ COD → paid). */
export const POSTEX_DELIVERED_STATUSES = new Set(["delivered"]);

const SHIPPED_LIKE = new Set([
  "booked",
  "picked by postex",
  "postex warehouse",
  "out for delivery",
  "en-route to postex warehouse",
  "attempted",
  "delivery under review",
]);

const RETURNED_LIKE = new Set(["returned", "out for return"]);

const IGNORE_LIKE = new Set(["unbooked", "expired", "un-assigned by me"]);

export function normalizePostexStatus(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Map Postex orderStatus → our Order.orderStatus, or null = no fulfillment change.
 */
export function mapPostexStatusToOrderStatus(postexStatus) {
  const s = normalizePostexStatus(postexStatus);
  if (!s) return null;
  if (POSTEX_DELIVERED_STATUSES.has(s)) return "delivered";
  if (RETURNED_LIKE.has(s)) return "returned";
  if (SHIPPED_LIKE.has(s)) return "shipped";
  if (IGNORE_LIKE.has(s)) return null;
  // Dynamic "En-Route to {city} warehouse" variants
  if (s.startsWith("en-route to")) return "shipped";
  return null;
}

export function isPostexDeliveredStatus(postexStatus) {
  return POSTEX_DELIVERED_STATUSES.has(normalizePostexStatus(postexStatus));
}

export function verifyPostexWebhookSecret(headerValue) {
  const expected = String(process.env.POSTEX_WEBHOOK_SECRET || "").trim();
  if (!expected) {
    return { ok: false, error: "POSTEX_WEBHOOK_SECRET is not configured" };
  }
  const got = String(headerValue || "").trim();
  if (!got) {
    return { ok: false, error: "Missing webhook secret header" };
  }
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid webhook secret" };
  }
  return { ok: true };
}

export function parsePostexWebhookPayload(body) {
  const root = body && typeof body === "object" ? body : {};
  const nested =
    (root.dist && typeof root.dist === "object" && !Array.isArray(root.dist) && root.dist) ||
    (root.data && typeof root.data === "object" && !Array.isArray(root.data) && root.data) ||
    root;

  const trackingNumber = String(
    nested.trackingNumber || nested.trackingNo || root.trackingNumber || ""
  ).trim();
  const orderReferenceNumber = String(
    nested.orderReferenceNumber ||
      nested.orderRefNumber ||
      nested.orderReference ||
      root.orderReferenceNumber ||
      root.orderRefNumber ||
      ""
  ).trim();
  const statusUpdateDatetime = String(
    nested.statusUpdateDatetime || nested.statusUpdateDateTime || nested.transactionDate || ""
  ).trim();
  const orderStatus = String(
    nested.orderStatus || nested.transactionStatus || nested.status || root.orderStatus || ""
  ).trim();

  return {
    trackingNumber,
    orderReferenceNumber,
    statusUpdateDatetime,
    orderStatus,
  };
}

export function isCodPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "cod" || m.includes("cash");
}

/**
 * Apply mapped fulfillment (+ COD paid on Delivered only). Mutates order doc.
 * @returns {{ changed: boolean, codMarkedPaid: boolean, notes: string[] }}
 */
export function applyPostexStatusToOrder(order, parsed) {
  const notes = [];
  let changed = false;
  let codMarkedPaid = false;

  const mapped = mapPostexStatusToOrderStatus(parsed.orderStatus);
  const postexLabel = String(parsed.orderStatus || "").trim() || "(empty)";
  const actor = "Postex webhook";

  if (mapped && order.orderStatus !== mapped) {
    // Never move backwards from delivered → shipped via webhook noise
    if (!(order.orderStatus === "delivered" && mapped === "shipped")) {
      order.orderStatus = mapped;
      changed = true;
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: mapped,
        changedBy: actor,
        changedAt: new Date(),
        note: `Postex status "${postexLabel}" → ${mapped}`,
      });
      const info = ORDER_STATUS_TIMELINE_TITLES[mapped] || {
        title: mapped,
        description: "",
      };
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: mapped,
        title: info.title,
        description: `Updated via Postex webhook (${postexLabel})`,
        timestamp: new Date(),
        by: "postex-webhook",
      });
      order.markModified?.("timeline");
      notes.push(`orderStatus → ${mapped}`);
    }
  } else if (!mapped) {
    notes.push(`No fulfillment map for Postex status "${postexLabel}"`);
  }

  if (isPostexDeliveredStatus(parsed.orderStatus)) {
    if (!order.deliveredAt) {
      order.deliveredAt = new Date();
      changed = true;
    }
    if (isCodPaymentMethod(order.paymentMethod) && order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      if (!order.payment || typeof order.payment !== "object") {
        order.payment = {};
      }
      order.payment.paidAt = new Date();
      const remaining = Math.max(0, Number(order.payment.remainingCod) || 0);
      if (remaining > 0) {
        order.payment.paidAmount = Math.max(0, Number(order.payment.paidAmount) || 0) + remaining;
        order.payment.remainingCod = 0;
      }
      order.markModified?.("payment");
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: "paid",
        changedBy: actor,
        changedAt: new Date(),
        note: `Order #${order.orderNumber}: COD delivery confirmed via Postex webhook, payment status auto-updated to Paid`,
      });
      codMarkedPaid = true;
      changed = true;
      notes.push("COD paymentStatus → paid");
    }
  }

  if (parsed.trackingNumber) {
    const tn = parsed.trackingNumber;
    if (!order.trackingNumber) {
      order.trackingNumber = tn;
      changed = true;
    }
    if (!order.tracking || typeof order.tracking !== "object") order.tracking = {};
    if (!order.tracking.number) {
      order.tracking.number = tn;
      order.tracking.carrier = order.tracking.carrier || order.courier || "Postex";
      order.tracking.url =
        order.tracking.url || order.trackingUrl || storefrontTrackingUrl(tn);
      order.markModified?.("tracking");
      changed = true;
    }
  }

  return { changed, codMarkedPaid, notes, mappedOrderStatus: mapped };
}

/** WhatsApp A: render template only — never send. */
export function buildWhatsAppWouldNotify(order, settings, postexStatus) {
  const courier = settings?.courier || {};
  if (courier.sendTrackingToCustomer === false) {
    return { wouldNotify: false, preview: "", reason: "sendTrackingToCustomer disabled" };
  }
  // Only log preview for statuses customers care about most
  const s = normalizePostexStatus(postexStatus);
  if (s !== "delivered" && s !== "out for delivery" && s !== "booked" && s !== "picked by postex") {
    return { wouldNotify: false, preview: "", reason: `status ${postexStatus} not in notify preview set` };
  }

  const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
  const trackingUrl =
    storefrontTrackingUrl(tn) ||
    String(order.trackingUrl || order.tracking?.url || "").trim();

  let preview = "";
  const fromTemplate = getOrderShippedWhatsAppMessage(order, settings, {
    trackingNumber: tn,
    trackingUrl,
    courier: order.courier || "Postex",
  });
  if (fromTemplate) {
    preview = fromTemplate;
  } else {
    const tpl = String(
      courier.trackingMessageTemplate ||
        "Your order #{orderNumber} has been shipped via Postex! Track here: {trackingUrl}"
    );
    preview = tpl
      .replace(/#\{orderNumber\}/g, String(order.orderNumber || ""))
      .replace(/\{orderNumber\}/g, String(order.orderNumber || ""))
      .replace(/\{trackingUrl\}/g, trackingUrl)
      .replace(/\{trackingNumber\}/g, tn);
  }

  return {
    wouldNotify: true,
    preview,
    reason: "WhatsApp A dry-run (no provider send)",
  };
}
