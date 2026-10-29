/**
 * Ops dashboard: KPIs (today / period / month), sales trend, what needs attention,
 * best sellers, cities, courier and recent orders. All figures come from /api/dashboard.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BusinessInsightsCard } from "./BusinessInsightsCard";
import { CategorySalesDonut } from "./CategorySalesDonut";
import { CourierCard } from "./CourierCard";
import { DashboardDateRange } from "./DashboardDateRange";
import { InventoryAlertsCard } from "./InventoryAlertsCard";
import { KpiCards } from "./KpiCards";
import { LiveUsersCard } from "./LiveUsersCard";
import { OrdersByOriginCard } from "./OrdersByOriginCard";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import { QuickActions } from "./QuickActions";
import { RecentOrdersTable } from "./RecentOrdersTable";
import { SalesTrendChart } from "./SalesTrendChart";
import { TopCitiesCard } from "./TopCitiesCard";
import { TopProductsCard } from "./TopProductsCard";
import { StockAlertBanner } from "@/components/stock-alerts/StockAlertBanner";
import { CloudinaryAlertBanner } from "./CloudinaryAlertBanner";

const emptyData = {
  todaySales: 0,
  todayPaidSales: 0,
  todayOrders: 0,
  todaySalesGrowth: 0,
  todayOrdersGrowth: 0,
  pendingOrders: 0,
  todayVisitors: 0,
  yesterdayVisitors: 0,
  todayVisitorsGrowth: 0,
  todayConversionRate: null,
  yesterdayConversionRate: null,
  periodOrders: 0,
  ordersReceived: 0,
  periodBooked: 0,
  periodBookedGrowth: null,
  avgOrderValue: 0,
  priorAvgOrderValue: null,
  periodCollected: 0,
  periodToCollect: 0,
  unpaidOrdersPeriod: 0,
  partialOrdersPeriod: 0,
  cancelledOrdersPeriod: 0,
  cancelRate: null,
  periodVisitors: 0,
  periodConversionRate: null,
  periodConversionGrowth: null,
  conversionTrackedDays: 0,
  conversionOrders: 0,
  conversionVisitors: 0,
  monthlyRevenue: 0,
  lastMonthSameDaysRevenue: 0,
  lastMonthRevenue: 0,
  monthlyGrowth: 0,
  totalProfit: 0,
  profitMargin: null,
  profitCostCoverage: null,
  profitGrowth: null,
  ordersDispatched: 0,
  ordersDelivered: 0,
  ordersReturned: 0,
  courierSettled: 0,
  deliveryRatio: null,
  returnRatio: null,
  stuckShipped: 0,
  orderGaps: [],
  recentOrders: [],
  salesTrend: [],
  chartMode: "day",
  lowStockProducts: [],
  salesByCategory: [],
  paymentMethods: [],
  ordersByOrigin: [],
  topProducts: [],
  topCities: [],
  insights: [],
  range: { id: "last30", label: "Last 30 days", from: null, to: null, days: 30 },
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
  const gaps = Array.isArray(data.orderGaps) ? data.orderGaps : [];

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

      {gaps.length && !data.financialsHidden ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Missing orders:</strong> no orders are recorded for{" "}
          {gaps.map((g) => `${g.label} (${g.days} days)`).join(", ")}. Totals for {rangeLabel} are lower than
          real sales — those orders are probably still in the old database.
        </div>
      ) : null}

      <div className={loading ? "pointer-events-none opacity-60 transition" : "transition"}>
        <KpiCards data={data} />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesTrendChart data={data.salesTrend} rangeLabel={rangeLabel} chartMode={data.chartMode} loading={loading} />
          </div>
          <BusinessInsightsCard insights={data.insights} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TopProductsCard products={data.topProducts} rangeLabel={rangeLabel} />
          <TopCitiesCard cities={data.topCities} rangeLabel={rangeLabel} />
          <CategorySalesDonut data={data.salesByCategory} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CourierCard data={data} />
          </div>
          <PaymentMethodsCard methods={data.paymentMethods} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentOrdersTable orders={data.recentOrders} />
          </div>
          <div className="space-y-4">
            <QuickActions />
            <InventoryAlertsCard products={data.lowStockProducts} />
            <OrdersByOriginCard data={data} rangeLabel={rangeLabel} />
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] font-medium tracking-wide text-slate-400">
          CrazzyCars Admin · Live · Fast · Reliable
        </p>
      </div>
    </div>
    </div>
  );
}
