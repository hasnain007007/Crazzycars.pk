/** Tailwind classes for order / payment status badges (admin orders UI). */

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

/** Whole days since createdAt (floor). */
export function pendingAgeDays(createdAt, now = new Date()) {
  const t = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/**
 * Age brackets matching the O1 backlog report: 0–3 / 3–7 / 7–14 / 14+.
 * @returns {{ label: string, className: string, bracket: string } | null}
 */
export function pendingAgeBadge(createdAt, orderStatus, now = new Date()) {
  if (String(orderStatus || "").toLowerCase() !== "pending") return null;
  const days = pendingAgeDays(createdAt, now);
  if (days == null) return null;
  let bracket;
  let className;
  if (days <= 3) {
    bracket = "0-3";
    className = "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
  } else if (days <= 7) {
    bracket = "3-7";
    className = "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  } else if (days <= 14) {
    bracket = "7-14";
    className = "bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100";
  } else {
    bracket = "14+";
    className = "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100";
  }
  const label = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  return { label, className, bracket, days };
}
