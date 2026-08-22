/**
 * Hero KPI grid — instrument panel (D1).
 * File: components/dashboard/KpiCards.jsx  (wired from DashboardView)
 *
 * Hierarchy rule: the BIG number is the glance-first figure (usually money).
 * Counts / pending sit on the secondary line.
 */
import { formatAdminPrice } from "@/lib/currency";

/** @typedef {"money" | "attention" | "line"} TrendTone */

function TrendTick({ value, tone = "money" }) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const up = n >= 0;
  const color =
    tone === "attention" ? "#C0503A" : tone === "line" ? "#3A6B5C" : "#C9A24B";

  return (
    <div className="mt-2.5 flex items-center gap-2" title={`${up ? "+" : ""}${n}% vs prior`}>
      <span
        className="block h-0.5 w-9 shrink-0 rounded-[1px]"
        style={{ background: color, transform: up ? "skewX(-18deg)" : "skewX(18deg)" }}
        aria-hidden
      />
      <span
        className="text-[11px] font-medium tracking-tight"
        style={{
          color,
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span aria-hidden>{up ? "↑" : "↓"}</span>
        {Math.abs(n).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%
      </span>
    </div>
  );
}

function GaugeValue({ children, money = false, color = "#EDEEF0" }) {
  const mono = {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontVariantNumeric: "tabular-nums",
  };

  if (!money || typeof children !== "string") {
    return (
      <span className="text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[1.85rem]" style={{ ...mono, color }}>
        {children}
      </span>
    );
  }

  const m = children.match(/^(Rs\.\s*)([\d,.\-]+.*)$/);
  if (!m) {
    return (
      <span className="text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[1.85rem]" style={{ ...mono, color }}>
        {children}
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 leading-none">
      <span className="text-sm font-medium" style={{ color: "#8B909A" }}>
        {m[1].trim()}
      </span>
      <span className="text-[1.65rem] font-semibold tracking-tight sm:text-[1.85rem]" style={{ ...mono, color }}>
        {m[2]}
      </span>
    </span>
  );
}

function HeroCard({ label, value, trend, tone = "money", hint, money = false }) {
  const valueColor =
    tone === "attention" ? "#C0503A" : tone === "money" && money ? "#C9A24B" : "#EDEEF0";

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#1E2126",
        border: "1px solid #2C3038",
        boxShadow: "none",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "#8B909A" }}
      >
        {label}
      </p>
      <div className="mt-3">
        <GaugeValue money={money} color={valueColor}>
          {value}
        </GaugeValue>
      </div>
      <TrendTick value={trend} tone={tone} />
      {hint ? (
        <p className="mt-2 text-[11px] leading-snug" style={{ color: "#8B909A" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function formatCount(n) {
  return (Number(n) || 0).toLocaleString("en-PK");
}

export function KpiCards({ data }) {
  const d = data || {};
  const margin = Number(d.profitMargin) || 0;
  const rangeLabel = d.range?.label || "period";
  const pendingToday = Number(d.pendingOrders) || 0;
  const pendingPeriod = Number(d.pendingOrdersPeriod) || 0;
  const paidOrders = Number(d.periodPaidOrders) || 0;
  const todayOrders = Number(d.todayOrders) || 0;
  const periodOrders = Number(d.periodOrders) || 0;

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      data-kpi-source="storecraft-admin/components/dashboard/KpiCards.jsx"
    >
      <HeroCard
        label="Today's Sales"
        value={formatAdminPrice(d.todaySales)}
        trend={d.todaySalesGrowth}
        tone="money"
        money
        hint="Paid revenue today (PKT)"
      />

      {/* Money first — order count is secondary */}
      <HeroCard
        label="Today's Orders"
        value={formatAdminPrice(d.todayOrderValue)}
        trend={d.todayOrdersGrowth}
        tone="money"
        money
        hint={`${formatCount(todayOrders)} orders today · ${formatCount(pendingToday)} pending`}
      />

      <HeroCard
        label="Today's Visitors"
        value={formatCount(d.todayVisitors)}
        trend={d.todayVisitorsGrowth}
        tone="line"
        hint={`Unique sessions today · vs ${formatCount(d.yesterdayVisitors)} yesterday`}
      />

      <HeroCard
        label="Monthly Revenue"
        value={formatAdminPrice(d.monthlyRevenue)}
        trend={d.monthlyGrowth}
        tone="money"
        money
        hint={`This month (PKT) · vs ${formatAdminPrice(d.lastMonthRevenue)} last month`}
      />

      {/* Period: paid Rs is the glance figure; counts move to subtext */}
      <HeroCard
        label="Period Revenue"
        value={formatAdminPrice(d.periodSales)}
        tone={pendingPeriod > 0 ? "attention" : "money"}
        money
        hint={`${formatCount(periodOrders)} orders · ${formatCount(paidOrders)} paid · ${formatCount(pendingPeriod)} pending · ${rangeLabel}`}
      />

      <HeroCard
        label="Net Profit"
        value={formatAdminPrice(d.totalProfit)}
        trend={d.profitGrowth ?? d.monthlyGrowth}
        tone="money"
        money
        hint={`${margin}% margin on paid sales · ${rangeLabel}`}
      />
    </div>
  );
}
