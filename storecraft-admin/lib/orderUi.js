/**
 * Order / payment badge helpers + pending-age brackets for the admin orders UI.
 */

/** Fulfillment-axis statuses (orderStatus) — distinct from payment. */
export const FULFILLMENT_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
  "refunded",
  "disputed",
];

/** Statuses that mean “still needs fulfillment work”. */
export const UNFULFILLED_STATUSES = ["pending", "confirmed", "processing", "packed"];

export function fulfillmentLabel(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    pending: "Unfulfilled",
    confirmed: "Confirmed",
    processing: "Processing",
    packed: "Packed",
    shipped: "Shipped",
    delivered: "Delivered",
    returned: "Returned",
    cancelled: "Cancelled",
    refunded: "Refunded",
    disputed: "Disputed",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
}

export function paymentLabel(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    unpaid: "Unpaid",
    paid: "Paid",
    partial: "Partial",
    refunded: "Refunded",
    failed: "Failed",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
}

/** Inline style for fulfillment badge (instrument tokens). */
export function fulfillmentBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "delivered") {
    return { background: "color-mix(in srgb, var(--accent-line) 18%, transparent)", color: "var(--accent-line)" };
  }
  if (["shipped", "packed", "processing", "confirmed"].includes(s)) {
    return { background: "color-mix(in srgb, var(--accent-line) 12%, transparent)", color: "var(--accent-line)" };
  }
  if (["cancelled", "refunded", "disputed", "returned"].includes(s)) {
    return { background: "color-mix(in srgb, var(--accent-attention) 16%, transparent)", color: "var(--accent-attention)" };
  }
  return { background: "color-mix(in srgb, var(--accent-money) 16%, transparent)", color: "var(--accent-money)" };
}

export function paymentBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") {
    return { background: "color-mix(in srgb, var(--accent-line) 18%, transparent)", color: "var(--accent-line)" };
  }
  if (s === "partial") {
    return { background: "color-mix(in srgb, var(--accent-money) 18%, transparent)", color: "var(--accent-money)" };
  }
  if (s === "unpaid" || s === "failed") {
    return { background: "color-mix(in srgb, var(--accent-attention) 16%, transparent)", color: "var(--accent-attention)" };
  }
  return { background: "color-mix(in srgb, var(--text-muted) 14%, transparent)", color: "var(--text-muted)" };
}

/** Legacy Tailwind classes — still used on customer detail / older cards. */
export function orderStatusBadgeClass(status) {
  const map = {
    pending: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
    processing: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    packed: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100",
    shipped: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    delivered: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    returned: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
    cancelled: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    refunded: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
    disputed: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
  };
  return map[status] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

export function paymentStatusBadgeClass(status) {
  const map = {
    paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    unpaid: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    refunded: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
    partial: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    failed: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  };
  return map[status] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

export function pendingAgeDays(createdAt, now = new Date()) {
  const t = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** OR8: pending + unpaid with no follow-through for N days (computed, not stored). */
export const STALE_ORDER_DAYS = 10;

/**
 * Read-time stale flag — no schema field, no cron, no status mutation.
 * pending + unpaid + age >= STALE_ORDER_DAYS.
 */
export function isStaleOrder(orderStatus, paymentStatus, createdAt, now = new Date()) {
  if (String(orderStatus || "").toLowerCase() !== "pending") return false;
  if (String(paymentStatus || "").toLowerCase() !== "unpaid") return false;
  const days = pendingAgeDays(createdAt, now);
  return days != null && days >= STALE_ORDER_DAYS;
}

/**
 * Age brackets: 0–3 / 3–7 / 7–14 / 14+.
 * @param {string} [paymentStatus] optional — when omitted, only pending fulfillment is aged
 */
export function pendingAgeBadge(createdAt, orderStatus, paymentStatus, now = new Date()) {
  const fulfillment = String(orderStatus || "").toLowerCase();
  const payment = String(paymentStatus || "").toLowerCase();
  const stillOpen =
    paymentStatus == null
      ? fulfillment === "pending"
      : UNFULFILLED_STATUSES.includes(fulfillment) ||
        (payment === "unpaid" && !["cancelled", "refunded"].includes(fulfillment));
  if (!stillOpen) return null;

  const days = pendingAgeDays(createdAt, now);
  if (days == null) return null;

  let bracket;
  let className;
  let style;
  if (days <= 3) {
    bracket = "0-3";
    className = "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
    style = { background: "color-mix(in srgb, var(--accent-line) 14%, transparent)", color: "var(--accent-line)" };
  } else if (days <= 7) {
    bracket = "3-7";
    className = "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
    style = { background: "color-mix(in srgb, var(--accent-money) 16%, transparent)", color: "var(--accent-money)" };
  } else if (days <= 14) {
    bracket = "7-14";
    className = "bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100";
    style = { background: "color-mix(in srgb, var(--accent-attention) 14%, transparent)", color: "var(--accent-attention)" };
  } else {
    bracket = "14+";
    className = "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100";
    style = { background: "color-mix(in srgb, var(--accent-attention) 22%, transparent)", color: "var(--accent-attention)" };
  }
  const label = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  return { label, className, style, bracket, days };
}

/** Customer tapped the signed WhatsApp cancel link (not staff cancel). */
export function isCustomerWaCancelled(order) {
  return (Array.isArray(order?.statusHistory) ? order.statusHistory : []).some(
    (h) =>
      String(h?.status || "").toLowerCase() === "cancelled" &&
      /whatsapp action link/i.test(String(h?.changedBy || ""))
  );
}

/**
 * Customer Yes/No from the WhatsApp confirm link — independent of warehouse
 * orderStatus ("Confirmed" there can be staff-only).
 */
export function customerConfirmKind(order) {
  if (order?.codConfirmed) return "confirmed";
  if (order?.customerCancelled || isCustomerWaCancelled(order)) return "cancelled";
  const st = String(order?.orderStatus || "").toLowerCase();
  if (["cancelled", "refunded"].includes(st)) return "na";
  return "waiting";
}

export function customerConfirmLabel(kind) {
  const map = {
    confirmed: "Yes",
    waiting: "Waiting",
    cancelled: "No",
    na: "—",
  };
  return map[kind] || "—";
}

export function customerConfirmBadgeStyle(kind) {
  if (kind === "confirmed") {
    return {
      background: "color-mix(in srgb, var(--accent-line) 16%, transparent)",
      color: "var(--accent-line)",
    };
  }
  if (kind === "waiting") {
    return {
      background: "color-mix(in srgb, var(--accent-money) 16%, transparent)",
      color: "var(--accent-money)",
    };
  }
  if (kind === "cancelled") {
    return {
      background: "color-mix(in srgb, var(--accent-attention) 16%, transparent)",
      color: "var(--accent-attention)",
    };
  }
  return {
    background: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    color: "var(--text-muted)",
  };
}
