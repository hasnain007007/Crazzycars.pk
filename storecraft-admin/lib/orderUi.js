/** Tailwind classes for order / payment status badges (admin orders UI). */

export function orderStatusBadgeClass(status) {
  const map = {
    pending: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
    processing: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    packed: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100",
    shipped: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    delivered: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
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
