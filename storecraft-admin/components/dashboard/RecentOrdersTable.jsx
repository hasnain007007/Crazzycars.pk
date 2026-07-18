/**
 * Recent orders — Order ID, Customer, City, Amount, Status.
 */
import Link from "next/link";
import { formatAdminPrice } from "@/lib/currency";

function statusBadge(status, paymentStatus) {
  const s = String(status || "").toLowerCase();
  const pay = String(paymentStatus || "").toLowerCase();
  if (pay === "paid" || s === "delivered") {
    return { label: pay === "paid" ? "PAID" : "DELIVERED", className: "bg-emerald-50 text-emerald-700" };
  }
  if (s === "pending" || pay === "pending") {
    return { label: "PENDING", className: "bg-amber-50 text-amber-700" };
  }
  if (s === "returned" || s === "cancelled" || pay === "failed") {
    return { label: s.toUpperCase() || "OVERDUE", className: "bg-red-50 text-red-700" };
  }
  if (s === "shipped") return { label: "SHIPPED", className: "bg-violet-50 text-violet-700" };
  return { label: (s || "—").toUpperCase(), className: "bg-slate-100 text-slate-600" };
}

export function RecentOrdersTable({ orders }) {
  const rows = orders || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent orders</h3>
          <p className="text-xs text-slate-400">Latest in selected period</p>
        </div>
        <Link href="/orders" className="text-xs font-semibold text-[#1A7A4C] hover:underline">
          View all
        </Link>
      </div>

      {!rows.length ? (
        <div className="px-5 py-12 text-center text-sm text-slate-400">No orders in this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-5 py-2.5 font-semibold">Order ID</th>
                <th className="px-5 py-2.5 font-semibold">Customer</th>
                <th className="px-5 py-2.5 font-semibold">City</th>
                <th className="px-5 py-2.5 font-semibold">Amount</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
              {rows.map((o) => {
                const badge = statusBadge(o.status, o.paymentStatus);
                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-xs font-semibold text-slate-800 hover:text-[#1A7A4C] dark:text-slate-100"
                      >
                        {o.orderNumber || o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{o.customerName}</td>
                    <td className="px-5 py-3 text-slate-500">{o.city || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatAdminPrice(o.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
