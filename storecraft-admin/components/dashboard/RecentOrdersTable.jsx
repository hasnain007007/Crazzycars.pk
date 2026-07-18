/**
 * Table of recent orders — matches clean dashboard chrome.
 */
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusBadge(status) {
  const map = {
    pending: "bg-amber-50 text-amber-800",
    confirmed: "bg-sky-50 text-sky-800",
    processing: "bg-blue-50 text-blue-800",
    packed: "bg-indigo-50 text-indigo-800",
    shipped: "bg-violet-50 text-violet-800",
    delivered: "bg-emerald-50 text-emerald-800",
    returned: "bg-orange-50 text-orange-800",
    cancelled: "bg-red-50 text-red-800",
    refunded: "bg-slate-100 text-slate-700",
    disputed: "bg-orange-50 text-orange-800",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export function RecentOrdersTable({ orders, rangeLabel }) {
  const rows = orders || [];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent orders</h3>
        <p className="text-xs text-slate-400">{rangeLabel || "Period"} · latest 10</p>
      </div>

      {!rows.length ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No orders in this period</p>
          <p className="mt-1 text-xs text-slate-400">Try another date range</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-5 py-2.5 font-medium">Order</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Total</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {o.orderNumber || o.id}
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{o.customerName}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(o.total)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(o.status)}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDate(o.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
