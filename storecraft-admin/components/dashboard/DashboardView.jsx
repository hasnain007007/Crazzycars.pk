/**
 * Client dashboard — clean single-surface layout.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardDateRange } from "./DashboardDateRange";
import { KpiCards } from "./KpiCards";
import { LiveUsersCard } from "./LiveUsersCard";
import { OrderStatusPieChart } from "./OrderStatusPieChart";
import { RecentOrdersTable } from "./RecentOrdersTable";
import { SalesTrendChart } from "./SalesTrendChart";
import { StockAlertBanner } from "@/components/stock-alerts/StockAlertBanner";

const emptyData = {
  todaySales: 0,
  todayOrders: 0,
  periodSales: 0,
  periodOrders: 0,
  totalRevenue: 0,
  totalSell: 0,
  totalProfit: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  ordersReceived: 0,
  ordersDispatched: 0,
  ordersDelivered: 0,
  ordersReturned: 0,
  recentOrders: [],
  orderStatusCounts: {
    pending: 0,
    confirmed: 0,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
    refunded: 0,
    disputed: 0,
  },
  salesLast7Days: [],
  salesTrend: [],
  chartMode: "day",
  lowStockProducts: [],
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
  const [topLocations, setTopLocations] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders?limit=100", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success || cancelled) return;
        const orders = json.orders || [];
        const cityCounts = {};
        for (const order of orders) {
          const city = order.shippingCity || order.shippingAddress?.city;
          if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
        const topCities = Object.entries(cityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));
        if (!cancelled) setTopLocations(topCities);
      } catch {
        if (!cancelled) setTopLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="mx-auto max-w-6xl space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <StockAlertBanner lowStockProducts={data.lowStockProducts} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Period</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{rangeLabel}</p>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <DashboardDateRange
            rangeId={rangeId}
            from={customFrom}
            to={customTo}
            onChange={onRangeChange}
            loading={loading}
          />
        </div>
        <LiveUsersCard compact />
      </div>

      {/* Metrics */}
      <div className={loading ? "opacity-50 transition" : "transition"}>
        <KpiCards data={data} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesTrendChart data={trendData} rangeLabel={rangeLabel} chartMode={data.chartMode} />
        </div>
        <div className="lg:col-span-2">
          <OrderStatusPieChart counts={data.orderStatusCounts} rangeLabel={rangeLabel} />
        </div>
      </div>

      {/* Orders + locations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentOrdersTable orders={data.recentOrders} rangeLabel={rangeLabel} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top locations</h3>
          <p className="text-xs text-slate-400">Recent orders</p>
          {topLocations.length ? (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {topLocations.map(({ city, count }, idx) => (
                <li key={city} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                    <span className="w-4 text-xs tabular-nums text-slate-400">{idx + 1}</span>
                    {city}
                  </span>
                  <span className="tabular-nums text-slate-500">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-center text-sm text-slate-400">No location data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
