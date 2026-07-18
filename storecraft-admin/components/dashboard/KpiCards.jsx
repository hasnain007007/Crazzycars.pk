/**
 * Hero KPI row — Today's Sales, Monthly Revenue, Net Profit (reference layout).
 */
import { formatAdminPrice } from "@/lib/currency";

const GREEN = "#1A7A4C";
const ORANGE = "#E8913A";

function GrowthBadge({ value }) {
  const n = Number(value) || 0;
  const up = n >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {Math.abs(n)}%
    </span>
  );
}

function HeroCard({ label, value, badge, hint, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: accent || GREEN }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {badge != null ? <GrowthBadge value={badge} /> : null}
      </div>
      <p className="mt-2 pl-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1.5 pl-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function KpiCards({ data }) {
  const d = data || {};
  const margin = Number(d.profitMargin) || 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <HeroCard
        label="Today's Sales"
        value={formatAdminPrice(d.todaySales)}
        badge={d.todaySalesGrowth}
        hint={`${d.todayOrders ?? 0} orders today`}
        accent={GREEN}
      />
      <HeroCard
        label="Monthly Revenue"
        value={formatAdminPrice(d.monthlyRevenue)}
        badge={d.monthlyGrowth}
        hint={`vs ${formatAdminPrice(d.lastMonthRevenue)} last month`}
        accent={GREEN}
      />
      <HeroCard
        label="Net Profit"
        value={formatAdminPrice(d.totalProfit)}
        badge={d.profitGrowth ?? d.monthlyGrowth}
        hint={`${margin}% margin · period`}
        accent={ORANGE}
      />
    </div>
  );
}
