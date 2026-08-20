/**
 * Hero KPI grid — sales, orders, visitors, period totals, profit.
 */
import { formatAdminPrice } from "@/lib/currency";

const GREEN = "#1A7A4C";
const ORANGE = "#E8913A";
const BLUE = "#1d6fb8";
const PURPLE = "#6d28d9";

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

function formatCount(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-PK");
}

export function KpiCards({ data }) {
  const d = data || {};
  const margin = Number(d.profitMargin) || 0;
  const rangeLabel = d.range?.label || "period";
  const pendingToday = Number(d.pendingOrders) || 0;
  const pendingPeriod = Number(d.pendingOrdersPeriod) || 0;
  const paidOrders = Number(d.periodPaidOrders) || 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <HeroCard
        label="Today's Sales"
        value={formatAdminPrice(d.todaySales)}
        badge={d.todaySalesGrowth}
        hint="Paid revenue today (PKT)"
        accent={GREEN}
      />
      <HeroCard
        label="Today's Orders"
        value={formatCount(d.todayOrders)}
        badge={d.todayOrdersGrowth}
        hint={`${formatAdminPrice(d.todayOrderValue)} order value · ${pendingToday} pending today`}
        accent={BLUE}
      />
      <HeroCard
        label="Today's Visitors"
        value={formatCount(d.todayVisitors)}
        badge={d.todayVisitorsGrowth}
        hint={`Unique sessions today · vs ${formatCount(d.yesterdayVisitors)} yesterday`}
        accent={PURPLE}
      />
      <HeroCard
        label="Monthly Revenue"
        value={formatAdminPrice(d.monthlyRevenue)}
        badge={d.monthlyGrowth}
        hint={`This month (PKT) · vs ${formatAdminPrice(d.lastMonthRevenue)} last month`}
        accent={GREEN}
      />
      <HeroCard
        label="Period Orders"
        value={formatCount(d.periodOrders)}
        hint={`${formatAdminPrice(d.periodSales)} paid · ${paidOrders} paid orders · ${pendingPeriod} pending · ${rangeLabel}`}
        accent={BLUE}
      />
      <HeroCard
        label="Net Profit"
        value={formatAdminPrice(d.totalProfit)}
        badge={d.profitGrowth ?? d.monthlyGrowth}
        hint={`${margin}% margin on paid sales · ${rangeLabel}`}
        accent={ORANGE}
      />
    </div>
  );
}
