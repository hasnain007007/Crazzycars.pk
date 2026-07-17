/**
 * Row of five KPI stat cards for the admin dashboard.
 */
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function Card({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function KpiCards({ data }) {
  const d = data || {};
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card label="Total sales today" value={formatMoney(d.todaySales)} />
      <Card label="Total orders today" value={String(d.todayOrders ?? 0)} />
      <Card label="Total revenue (all time)" value={formatMoney(d.totalRevenue)} />
      <Card label="Total customers" value={String(d.totalCustomers ?? 0)} />
      <Card label="Pending orders" value={String(d.pendingOrders ?? 0)} />
    </div>
  );
}
