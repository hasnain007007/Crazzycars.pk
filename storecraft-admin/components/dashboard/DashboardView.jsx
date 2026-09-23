/**
 * Modern ops dashboard — forest green / amber accents, live visitors, full widgets.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AiAgentTrafficCard } from "./AiAgentTrafficCard";
import { BusinessInsightsCard } from "./BusinessInsightsCard";
import { CategorySalesDonut } from "./CategorySalesDonut";
import { DashboardDateRange } from "./DashboardDateRange";
import { DeliveryReturnRatioCard } from "./DeliveryReturnRatioCard";
import { InventoryAlertsCard } from "./InventoryAlertsCard";
import { KpiCards } from "./KpiCards";
import { LiveUsersCard } from "./LiveUsersCard";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import { QuickActions } from "./QuickActions";
import { RecentOrdersTable } from "./RecentOrdersTable";
import { RevenueCostBarChart } from "./RevenueCostBarChart";
import { SalesTrendChart } from "./SalesTrendChart";
import { StockAlertBanner } from "@/components/stock-alerts/StockAlertBanner";
import { CloudinaryAlertBanner } from "./CloudinaryAlertBanner";

const emptyData = {
  todaySales: 0,
  todayOrders: 0,
  todayOrderValue: 0,
  todaySalesGrowth: 0,
  todayOrdersGrowth: 0,
  todayVisitors: 0,
  yesterdayVisitors: 0,
  todayVisitorsGrowth: 0,
  periodVisitors: 0,
  todayConversionRate: null,
  yesterdayConversionRate: null,
  todayConversionGrowth: null,
  periodConversionRate: null,
  priorPeriodConversionRate: null,
  periodConversionGrowth: null,
  monthlyRevenue: 0,
  lastMonthRevenue: 0,
  monthlyGrowth: 0,
  periodSales: 0,
  periodOrders: 0,
  totalRevenue: 0,
  totalSell: 0,
  totalProfit: 0,
  totalCost: 0,
  profitMargin: 0,
  profitGrowth: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  ordersReceived: 0,
  ordersDispatched: 0,
  ordersDelivered: 0,
  ordersReturned: 0,
  courierSettled: 0,
  deliveryRatio: null,
  returnRatio: null,
  recentOrders: [],
  orderStatusCounts: {},
  salesLast7Days: [],
  salesTrend: [],
  chartMode: "day",
  lowStockProducts: [],
  salesByCategory: [],
  paymentMethods: [],
  weekdayRevenueVsCost: [],
  insights: [],
  range: { id: "last30", label: "Last 30 days", from: null, to: null },
};

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultCustomWindow() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: ymdLocal(from), to: ymdLocal(to) };
}

export function DashboardView() {
  const customDefaults = useMemo(() => defaultCustomWindow(), []);
  const [rangeId, setRangeId] = useState("last30");
  const [customFrom, setCustomFrom] = useState(customDefaults.from);
  const [customTo, setCustomTo] = useState(customDefaults.to);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("range", rangeId);
    if (rangeId === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    return params.toString();
  }, [rangeId, customFrom, customTo]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard?${queryString}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load dashboard.");
        setData(emptyData);
        return;
      }
      setData({ ...emptyData, ...json.data });
    } catch {
      setError("Could not load dashboard.");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRangeChange = ({ rangeId: nextId, from, to }) => {
    setRangeId(nextId);
    if (nextId === "custom") {
      if (from) setCustomFrom(from);
      if (to) setCustomTo(to);
    }
  };

  const rangeLabel = data.range?.label || "Last 30 days";
  const trendData = data.salesTrend?.length ? data.salesTrend : data.salesLast7Days;

  return (
    <div className="dashboard-instrument -mx-4 -my-5 min-h-[calc(100vh-3.5rem)] bg-bg-base px-4 py-5 text-text-primary md:-mx-6 md:-my-6 md:px-6 md:py-6">
    <div className="mx-auto max-w-7xl space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <CloudinaryAlertBanner />
      <StockAlertBanner lowStockProducts={data.lowStockProducts} />

      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)]">CrazzyCars ops overview · {rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LiveUsersCard variant="badge" />
          <DashboardDateRange
            rangeId={rangeId}
            from={customFrom}
            to={customTo}
            onChange={onRangeChange}
            loading={loading}
          />
        </div>
      </div>

      <div className={loading ? "pointer-events-none opacity-60 transition" : "transition"}>
        {/* Hero KPIs */}
        <KpiCards data={data} />

        {/* Courier delivery / return portion */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DeliveryReturnRatioCard
            data={data}
            from={customFrom}
            to={customTo}
            onRangeChange={onRangeChange}
            loading={loading}
          />
          <div className="rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none">
            <h3
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--text-muted)" }}
            >
              Courier funnel ({rangeLabel})
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Received", value: data.ordersReceived, color: "var(--text-primary)" },
                { label: "Dispatched", value: data.ordersDispatched, color: "#085041" },
                { label: "Delivered", value: data.ordersDelivered, color: "#0C5132" },
                { label: "Returned", value: data.ordersReturned, color: "#7A2E0B" },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    {row.label}
                  </p>
                  <p className="font-gauge mt-1 text-2xl font-bold tabular-nums" style={{ color: row.color }}>
                    {(Number(row.value) || 0).toLocaleString("en-PK")}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
              Use the calendar on Courier success to pick days. Dispatched = currently shipped; delivered / returned =
              final courier outcomes in the selected period.
            </p>
          </div>
        </div>

        {/* Charts row */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SalesTrendChart data={trendData} rangeLabel={rangeLabel} chartMode={data.chartMode} loading={loading} />
          <RevenueCostBarChart data={data.weekdayRevenueVsCost} />
          <CategorySalesDonut data={data.salesByCategory} />
        </div>

        {/* Orders + actions + payments */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <RecentOrdersTable orders={data.recentOrders} />
          </div>
          <div className="lg:col-span-3">
            <QuickActions />
          </div>
          <div className="lg:col-span-3">
            <PaymentMethodsCard methods={data.paymentMethods} />
          </div>
        </div>

        {/* Live + inventory + insights */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LiveUsersCard variant="card" />
          <InventoryAlertsCard products={data.lowStockProducts} />
          <BusinessInsightsCard insights={data.insights} />
        </div>

        {/* AI discoverability / referrer proxy — not sales attribution */}
        <div className="mt-5">
          <AiAgentTrafficCard />
        </div>

        <p className="mt-8 text-center text-[11px] font-medium tracking-wide text-slate-400">
          CrazzyCars Admin · Live · Fast · Reliable
        </p>
      </div>
    </div>
    </div>
  );
}
