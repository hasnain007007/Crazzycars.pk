/**
 * Order / payment badge helpers + pending-age brackets for the admin orders UI.
 * Badge tones follow Shopify Polaris (attention / info / success / warning / critical).
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

/** Shopify Polaris badge tone tokens (match Admin Orders pills). */
const SHOPIFY_TONES = {
  // Unfulfilled — yellow / attention
  attention: { background: "#FFEA8A", color: "#4F4700", dot: "#8A7C00" },
  // Confirmed / in progress — blue / info
  info: { background: "#E0F0FF", color: "#003A5A", dot: "#005BD3" },
  // Processing — stronger blue
  infoStrong: { background: "#C8E1FF", color: "#002B4D", dot: "#005BD3" },
  // Packed — indigo
  indigo: { background: "#E4E5FF", color: "#2C2E6B", dot: "#5C6AC4" },
  // Shipped / fulfilled-in-transit — teal
  teal: { background: "#A4E8F2", color: "#003D4D", dot: "#0096B3" },
  // Delivered / paid — green / success
  success: { background: "#AEE9D1", color: "#0C5132", dot: "#29845A" },
  // Partial / payment pending — peach
  warning: { background: "#FFD6A4", color: "#5E4200", dot: "#B98900" },
  // Returned / disputed
  caution: { background: "#FFC96B", color: "#5E4200", dot: "#B98900" },
  // Unpaid / cancelled / failed — critical
  critical: { background: "#FED3D1", color: "#8E1F0B", dot: "#D72C0D" },
  // Refunded / fulfilled / neutral
  neutral: { background: "#E4E5E7", color: "#4A4A4A", dot: "#8A8A8A" },
};

/** Dot color for Polaris-style status pills. */
export function badgeDotColor(style) {
  return style?.dot || "#8A8A8A";
}

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

/** Inline style for fulfillment badge — Shopify-distinct per status. */
export function fulfillmentBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return SHOPIFY_TONES.attention;
  if (s === "confirmed") return SHOPIFY_TONES.info;
  if (s === "processing") return SHOPIFY_TONES.infoStrong;
  if (s === "packed") return SHOPIFY_TONES.indigo;
  if (s === "shipped") return SHOPIFY_TONES.teal;
  if (s === "delivered") return SHOPIFY_TONES.success;
  if (s === "returned" || s === "disputed") return SHOPIFY_TONES.caution;
  if (s === "cancelled") return SHOPIFY_TONES.critical;
  if (s === "refunded") return SHOPIFY_TONES.neutral;
  return SHOPIFY_TONES.attention;
}

export function paymentBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return SHOPIFY_TONES.success;
  if (s === "partial" || s === "unpaid") return SHOPIFY_TONES.warning;
  if (s === "failed") return SHOPIFY_TONES.critical;
  if (s === "refunded") return SHOPIFY_TONES.neutral;
  return SHOPIFY_TONES.neutral;
}

/** Legacy Tailwind classes — still used on customer detail / older cards. */
export function orderStatusBadgeClass(status) {
  const map = {
    pending: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
    processing: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    packed: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100",
    shipped: "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100",
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
    partial: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
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
    style = { ...SHOPIFY_TONES.success };
  } else if (days <= 7) {
    bracket = "3-7";
    className = "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
    style = { ...SHOPIFY_TONES.attention };
  } else if (days <= 14) {
    bracket = "7-14";
    className = "bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100";
    style = { ...SHOPIFY_TONES.warning };
  } else {
    bracket = "14+";
    className = "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100";
    style = { ...SHOPIFY_TONES.critical };
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
  if (kind === "confirmed") return { ...SHOPIFY_TONES.success };
  if (kind === "waiting") return { ...SHOPIFY_TONES.attention };
  if (kind === "cancelled") return { ...SHOPIFY_TONES.critical };
  return { ...SHOPIFY_TONES.neutral };
}
