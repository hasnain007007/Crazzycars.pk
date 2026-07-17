/**
 * Client dashboard: loads /api/dashboard and renders KPIs, charts, and tables.
 */
"use client";

import { useEffect, useState } from "react";
import { KpiCards } from "./KpiCards";
import { OrderStatusPieChart } from "./OrderStatusPieChart";
import { RecentOrdersTable } from "./RecentOrdersTable";
import { SalesTrendChart } from "./SalesTrendChart";
import { StockAlertBanner } from "@/components/stock-alerts/StockAlertBanner";

const emptyData = {
  todaySales: 0,
  todayOrders: 0,
  totalRevenue: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  recentOrders: [],
  orderStatusCounts: {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  },
  salesLast7Days: [],
  lowStockProducts: [],
};

export function DashboardView() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topLocations, setTopLocations] = useState([]);

  const runWatermarkTest = async () => {
    try {
      const { processImageToWebp } = await import("@/lib/client/processImageToWebp");
      const testCanvas = document.createElement("canvas");
      testCanvas.width = 400;
      testCanvas.height = 300;
      const ctx = testCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(0, 0, 400, 300);
      testCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const result = await processImageToWebp(blob, {
          watermark: true,
          watermarkText: "TEST WATERMARK",
        });
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank");
      }, "image/png");
    } catch (e) {
      console.error("Watermark test failed:", e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/dashboard", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (!cancelled) setError(json.error || "Could not load dashboard.");
          if (!cancelled) setData(emptyData);
          return;
        }
        if (!cancelled) setData({ ...emptyData, ...json.data });
      } catch {
        if (!cancelled) setError("Could not load dashboard.");
        if (!cancelled) setData(emptyData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <StockAlertBanner lowStockProducts={data.lowStockProducts} />
      <button
        type="button"
        onClick={runWatermarkTest}
        className="rounded-md border border-[#1d6fb8] bg-white px-3 py-2 text-sm font-semibold text-[#1d6fb8] hover:bg-[#eff6ff]"
      >
        Test Watermark
      </button>

      <KpiCards data={data} />

      {topLocations.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Top locations</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From the 100 most recent orders in the system.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {topLocations.map(({ city, count }) => (
              <li key={city}>
                <span className="font-medium text-slate-900 dark:text-white">{city}</span>
                {" — "}
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {count} order{count !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesTrendChart data={data.salesLast7Days} />
        <OrderStatusPieChart counts={data.orderStatusCounts} />
      </div>

      <RecentOrdersTable orders={data.recentOrders} />
    </div>
  );
}
