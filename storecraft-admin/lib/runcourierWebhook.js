/**
 * Run Courier status-update webhook helpers (mirrors PostEx webhook flow).
 * Flexible payload keys — Run Courier / Trax / TCS aggregators vary field names.
 */
import crypto from "node:crypto";
import { storefrontTrackingUrl, runCourierPublicTrackingUrl } from "@/lib/runcourier";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

export const RUN_COURIER_WEBHOOK_HEADER = "x-webhook-secret";
export const RAW_PAYLOAD_LOG_LIMIT = 20;

export function normalizeRunCourierStatus(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Map courier status string → Order.orderStatus, or null = no fulfillment change.
 */
export function mapRunCourierStatusToOrderStatus(rawStatus) {
  const s = normalizeRunCourierStatus(rawStatus);
  if (!s) return null;

  if (
    (s.includes("deliver") && !s.includes("out for") && !s.includes("attempt") && !s.includes("failed")) ||
    s === "delivered" ||
    s === "ok"
  ) {
    return "delivered";
  }
  if (
    s.includes("return") ||
    s.includes("rto") ||
    s.includes("rts") ||
    s.includes("undelivered") ||
    s.includes("refused")
  ) {
    return "returned";
  }
  if (
    s.includes("cancel") ||
    s.includes("void") ||
    s.includes("unbook") ||
    s.includes("expired")
  ) {
    return null;
  }
  if (
    s.includes("book") ||
    s.includes("pick") ||
    s.includes("transit") ||
    s.includes("dispatch") ||
    s.includes("hub") ||
    s.includes("warehouse") ||
    s.includes("out for") ||
    s.includes("en-route") ||
    s.includes("enroute") ||
    s.includes("arrived") ||
    s.includes("ship") ||
    s.includes("in process") ||
    s.includes("assigned")
  ) {
    return "shipped";
  }
  return null;
}

export function isRunCourierDeliveredStatus(rawStatus) {
  return mapRunCourierStatusToOrderStatus(rawStatus) === "delivered";
}

export function verifyRunCourierWebhookSecret(headerValue) {
  const expected = String(
    process.env.RUN_COURIER_WEBHOOK_SECRET || process.env.POSTEX_WEBHOOK_SECRET || ""
  ).trim();
  if (!expected) {
    return { ok: false, error: "RUN_COURIER_WEBHOOK_SECRET is not configured" };
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

export function parseRunCourierWebhookPayload(body) {
  const root = body && typeof body === "object" ? body : {};
  const nested =
    (root.dist && typeof root.dist === "object" && !Array.isArray(root.dist) && root.dist) ||
    (root.data && typeof root.data === "object" && !Array.isArray(root.data) && root.data) ||
    (root.shipment && typeof root.shipment === "object" && root.shipment) ||
    root;

  const trackingNumber = String(
    nested.trackingNumber ||
      nested.trackingNo ||
      nested.cn ||
      nested.consignmentNo ||
      nested.awb ||
      nested.code ||
      root.trackingNumber ||
      root.cn ||
      ""
  ).trim();

  const orderReferenceNumber = String(
    nested.orderReferenceNumber ||
      nested.orderRefNumber ||
      nested.order_reference ||
      nested.orderRef ||
      nested.reference ||
      root.orderReferenceNumber ||
      root.orderRef ||
      ""
  ).trim();

  const statusUpdateDatetime = String(
    nested.statusUpdateDatetime ||
      nested.statusUpdateDateTime ||
      nested.transactionDate ||
      nested.updated_at ||
      nested.timestamp ||
      ""
  ).trim();

  const orderStatus = String(
    nested.orderStatus ||
      nested.transactionStatus ||
      nested.status ||
      nested.currentStatus ||
      nested.shipmentStatus ||
      root.orderStatus ||
      root.status ||
      ""
  ).trim();

  const location = String(
    nested.location || nested.city || nested.currentLocation || nested.cityName || ""
  ).trim();

  return {
    trackingNumber,
    orderReferenceNumber,
    statusUpdateDatetime,
    orderStatus,
    location,
  };
}

function isCodPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "cod" || m.includes("cash");
}

/**
 * Apply mapped fulfillment (+ COD paid on Delivered). Mutates order doc.
 */
export function applyRunCourierStatusToOrder(order, parsed) {
  const notes = [];
  let changed = false;
  let codMarkedPaid = false;

  const mapped = mapRunCourierStatusToOrderStatus(parsed.orderStatus);
  const statusLabel = String(parsed.orderStatus || "").trim() || "(empty)";
  const actor = "Run Courier webhook";

  if (mapped && order.orderStatus !== mapped) {
    if (!(order.orderStatus === "delivered" && mapped === "shipped")) {
      order.orderStatus = mapped;
      changed = true;
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: mapped,
        changedBy: actor,
        changedAt: new Date(),
        note: `Run Courier status "${statusLabel}" → ${mapped}`,
      });
      const info = ORDER_STATUS_TIMELINE_TITLES[mapped] || {
        title: mapped,
        description: "",
      };
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: mapped,
        title: info.title,
        description: `Updated via Run Courier webhook (${statusLabel})`,
        timestamp: new Date(),
        by: "runcourier-webhook",
      });
      order.markModified?.("timeline");
      notes.push(`orderStatus → ${mapped}`);
    }
  } else if (!mapped) {
    notes.push(`No fulfillment map for Run Courier status "${statusLabel}"`);
  }

  if (isRunCourierDeliveredStatus(parsed.orderStatus)) {
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
        note: `Order #${order.orderNumber}: COD delivery confirmed via Run Courier webhook, payment status auto-updated to Paid`,
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
      order.tracking.carrier = order.tracking.carrier || order.courier || "Run Courier";
      order.tracking.url =
        order.tracking.url || storefrontTrackingUrl(tn) || runCourierPublicTrackingUrl(tn);
      changed = true;
    }
  }

  if (!order.tracking || typeof order.tracking !== "object") order.tracking = {};
  if (parsed.orderStatus) {
    order.tracking.lastStatus = parsed.orderStatus;
    order.tracking.lastStatusAt = new Date();
    changed = true;
  }
  if (parsed.location) {
    order.tracking.currentLocation = parsed.location;
    changed = true;
  }
  order.markModified?.("tracking");

  return { changed, codMarkedPaid, notes, mappedOrderStatus: mapped };
}
