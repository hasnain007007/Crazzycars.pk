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

function TrendTick({ value, tone = "money" }) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const up = n >= 0;
  const color = TONE_VAR[tone] || TONE_VAR.money;

  return (
    <div className="mt-2.5 flex items-center gap-2" title={`${up ? "+" : ""}${n}% vs prior`}>
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

function HeroCard({ label, value, trend, tone = "money", hint, money = false }) {
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
      <TrendTick value={trend} tone={tone} />
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
