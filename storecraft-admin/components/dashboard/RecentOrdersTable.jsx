/**
 * Table of the most recent orders with empty state when none exist.
 */
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function statusBadge(status) {
  const map = {
    pending: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    processing: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
    shipped: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
    delivered: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    cancelled: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    refunded: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  };
  return map[status] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

export function RecentOrdersTable({ orders }) {
  const rows = orders || [];

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-900 dark:text-white">No orders yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recent orders will show here once customers place them.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-border px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent orders</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last 10 orders</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-slate-800">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                  {o.orderNumber || o.id}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{o.customerName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-900 dark:text-white">{formatMoney(o.total)}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      statusBadge(o.status),
                    ].join(" ")}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(o.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
