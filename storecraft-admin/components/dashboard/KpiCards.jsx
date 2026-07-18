/**
 * Clean, uniform KPI metrics — no pastel chaos, no sparklines.
 */
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

const card =
  "rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900";

function Metric({ label, value, hint }) {
  return (
    <div className={card}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function KpiCards({ data }) {
  const d = data || {};
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Total sell" value={formatMoney(d.totalSell)} />
      <Metric label="Total profit" value={formatMoney(d.totalProfit)} />
      <Metric label="Paid revenue" value={formatMoney(d.totalRevenue)} />
      <Metric label="Orders received" value={String(d.ordersReceived ?? 0)} />
      <Metric label="Dispatched" value={String(d.ordersDispatched ?? 0)} hint="Shipped" />
      <Metric label="Delivered" value={String(d.ordersDelivered ?? 0)} />
      <Metric label="Returned" value={String(d.ordersReturned ?? 0)} />
      <Metric
        label="Pending now"
        value={String(d.pendingOrders ?? 0)}
        hint={`${d.totalCustomers ?? 0} customers`}
      />
    </div>
  );
}
