/**
 * Hero KPI grid — instrument panel (D1).
 * File: components/dashboard/KpiCards.jsx  (wired from DashboardView)
 *
 * Hierarchy rule: the BIG number is the glance-first figure (usually money).
 * Counts / pending sit on the secondary line.
 *
 * Colors come from theme tokens (--bg-panel, --accent-money, …) so the
 * existing html.dark / sialkot-theme toggle switches light ↔ graphite.
 */
import { formatAdminPrice } from "@/lib/currency";

/** @typedef {"money" | "attention" | "line"} TrendTone */

const TONE_VAR = {
  money: "var(--accent-money)",
  attention: "var(--accent-attention)",
  line: "var(--accent-line)",
};

function TrendTick({ value, tone = "money", label = "vs prior" }) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const up = n >= 0;
  const color = TONE_VAR[tone] || TONE_VAR.money;

  return (
    <div className="mt-2.5 flex items-center gap-2" title={`${up ? "+" : ""}${n}% ${label}`}>
      <span
        className="block h-0.5 w-9 shrink-0 rounded-[1px]"
        style={{ background: color, transform: up ? "skewX(-18deg)" : "skewX(18deg)" }}
        aria-hidden
      />
      <span
        className="font-gauge text-[11px] font-medium tracking-tight"
        style={{ color }}
      >
        <span aria-hidden>{up ? "↑" : "↓"}</span>
        {Math.abs(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%
      </span>
      <span className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

function GaugeValue({ children, money = false, color = "var(--text-primary)" }) {
  if (!money || typeof children !== "string") {
    return (
      <span
        className="font-gauge text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[1.85rem]"
        style={{ color }}
      >
        {children}
      </span>
    );
  }

  const m = children.match(/^(Rs\.\s*)([\d,.\-]+.*)$/);
  if (!m) {
    return (
      <span
        className="font-gauge text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[1.85rem]"
        style={{ color }}
      >
        {children}
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 leading-none">
      <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
        {m[1].trim()}
      </span>
      <span
        className="font-gauge text-[1.65rem] font-semibold tracking-tight sm:text-[1.85rem]"
        style={{ color }}
      >
        {m[2]}
      </span>
    </span>
  );
}

function HeroCard({ label, value, trend, trendLabel, tone = "money", hint, money = false }) {
  const valueColor =
    tone === "attention"
      ? "var(--accent-attention)"
      : tone === "money" && money
        ? "var(--accent-money)"
        : "var(--text-primary)";

  return (
    <div
      className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none"
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <div className="mt-3">
        <GaugeValue money={money} color={valueColor}>
          {value}
        </GaugeValue>
      </div>
      <TrendTick value={trend} tone={tone} label={trendLabel} />
      {hint ? (
        <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function formatCount(n) {
  return (Number(n) || 0).toLocaleString("en-PK");
}

function formatRate(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`;
}

function GroupLabel({ children }) {
  return (
    <p
      className="col-span-full mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] first:mt-0"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </p>
  );
}

export function KpiCards({ data }) {
  const d = data || {};
  const rangeLabel = d.range?.label || "period";
  const hasPrior = d.periodBookedGrowth != null;
  const priorLabel = "vs previous period";
  const trackedDays = Number(d.conversionTrackedDays) || 0;
  const rangeDays = Number(d.range?.days) || 0;
  const coverage = d.profitCostCoverage;
  const outstandingCount = (Number(d.unpaidOrdersPeriod) || 0) + (Number(d.partialOrdersPeriod) || 0);

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-kpi-source="storecraft-admin/components/dashboard/KpiCards.jsx"
    >
      <GroupLabel>Today</GroupLabel>
      <HeroCard
        label="Sales today"
        value={formatAdminPrice(d.todaySales)}
        trend={d.todaySalesGrowth}
        trendLabel="vs yesterday"
        tone="money"
        money
        hint={`Order value booked today${
          Number(d.todayPaidSales) > 0 ? ` · ${formatAdminPrice(d.todayPaidSales)} already collected` : ""
        }`}
      />
      <HeroCard
        label="Orders today"
        value={formatCount(d.todayOrders)}
        trend={d.todayOrdersGrowth}
        trendLabel="vs yesterday"
        tone="line"
        hint={`${formatCount(d.pendingOrders)} waiting for confirmation`}
      />
      <HeroCard
        label="Visitors today"
        value={formatCount(d.todayVisitors)}
        trend={d.todayVisitorsGrowth}
        trendLabel="vs yesterday"
        tone="line"
        hint={`${formatCount(d.yesterdayVisitors)} yesterday · unique visitors on the website`}
      />
      <HeroCard
        label="Conversion today"
        value={formatRate(d.todayConversionRate)}
        tone="line"
        hint={`${formatCount(d.todayOrders)} orders ÷ ${formatCount(d.todayVisitors)} visitors${
          d.yesterdayConversionRate != null ? ` · yesterday ${formatRate(d.yesterdayConversionRate)}` : ""
        }`}
      />

      <GroupLabel>{rangeLabel}</GroupLabel>
      <HeroCard
        label="Sales"
        value={formatAdminPrice(d.periodBooked)}
        trend={hasPrior ? d.periodBookedGrowth : null}
        trendLabel={priorLabel}
        tone="money"
        money
        hint={`${formatCount(d.periodOrders)} orders booked (cancelled & returned not counted)`}
      />
      <HeroCard
        label="Average order"
        value={formatAdminPrice(d.avgOrderValue)}
        tone="line"
        money
        hint={`${formatCount(d.cancelledOrdersPeriod)} cancelled${
          d.cancelRate != null ? ` (${formatRate(d.cancelRate)})` : ""
        }${d.priorAvgOrderValue ? ` · previous ${formatAdminPrice(d.priorAvgOrderValue)}` : ""}`}
      />
      <HeroCard
        label="Collected"
        value={formatAdminPrice(d.periodCollected)}
        tone="money"
        money
        hint="Paid orders + delivered COD + advances received"
      />
      <HeroCard
        label="Still to collect"
        value={formatAdminPrice(d.periodToCollect)}
        tone="attention"
        money
        hint={`${formatCount(outstandingCount)} open orders (advance already received is subtracted)`}
      />

      <GroupLabel>This month &amp; health</GroupLabel>
      <HeroCard
        label="Sales this month"
        value={formatAdminPrice(d.monthlyRevenue)}
        trend={d.monthlyGrowth}
        trendLabel="vs same days last month"
        tone="money"
        money
        hint={`Same days last month ${formatAdminPrice(d.lastMonthSameDaysRevenue)} · full last month ${formatAdminPrice(d.lastMonthRevenue)}`}
      />
      <HeroCard
        label="Conversion rate"
        value={formatRate(d.periodConversionRate)}
        trend={d.periodConversionGrowth}
        trendLabel={priorLabel}
        tone="line"
        hint={
          trackedDays > 0
            ? `${formatCount(d.conversionOrders)} orders ÷ ${formatCount(d.conversionVisitors)} visitors${
                rangeDays && trackedDays < rangeDays ? ` · ${trackedDays} of ${rangeDays} days tracked` : ""
              }`
            : "No visitor data in this period"
        }
      />
      <HeroCard
        label="Gross profit"
        value={coverage == null ? "—" : formatAdminPrice(d.totalProfit)}
        trend={coverage == null ? null : d.profitGrowth}
        trendLabel={priorLabel}
        tone="money"
        money
        hint={
          coverage == null
            ? "No paid or delivered orders yet"
            : `${formatRate(d.profitMargin)} margin · cost price known for ${formatRate(coverage)} of sales`
        }
      />
      <HeroCard
        label="Delivery success"
        value={formatRate(d.deliveryRatio)}
        tone={d.returnRatio != null && d.returnRatio >= 15 ? "attention" : "line"}
        hint={`${formatCount(d.ordersDelivered)} delivered · ${formatCount(d.ordersReturned)} returned${
          Number(d.stuckShipped) > 0 ? ` · ${formatCount(d.stuckShipped)} stuck in shipped` : ""
        }`}
      />
    </div>
  );
}
