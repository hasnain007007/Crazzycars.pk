"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminPrice } from "@/lib/currency";

const ORDER_STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const PIE_COLORS = ["#1d6fb8", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b", "#ef4444"];

function formatMoney(n) {
  return formatAdminPrice(Number(n) || 0);
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);
  return { fromStr, toStr };
}

export function SalesReport() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(defaults.fromStr);
  const [to, setTo] = useState(defaults.toStr);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    topProduct: { name: "—", revenue: 0 },
  });
  const [byDay, setByDay] = useState([]);
  const [byCategory, setByCategory] = useState([]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (status && status !== "all") p.set("status", status);
    return p.toString();
  }, [from, to, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales?${queryString}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not load sales report.");
        return;
      }
      setSummary(
        json.summary || {
          totalRevenue: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          topProduct: { name: "—", revenue: 0 },
        }
      );
      setByDay(json.byDay || []);
      setByCategory(json.byCategory || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const barData = useMemo(
    () =>
      (byDay || []).map((d) => ({
        date: d.date,
        revenue: Number(d.revenue) || 0,
        orders: d.orders || 0,
      })),
    [byDay]
  );

  const pieData = useMemo(
    () =>
      (byCategory || []).map((c) => ({
        name: c.name || "—",
        value: Number(c.revenue) || 0,
        count: c.count || 0,
      })),
    [byCategory]
  );

  function downloadCsv() {
    const lines = [["Date", "Orders", "Revenue", "Avg order value"]];
    for (const d of byDay || []) {
      lines.push([
        d.date,
        String(d.orders ?? ""),
        String(d.revenue ?? ""),
        String(d.avg ?? ""),
      ]);
    }
    const blob = new Blob([lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${from || "from"}-${to || "to"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  }

  const tp = summary.topProduct || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales report</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Revenue, orders, and category mix.</p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Order status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-[#1d6fb8] px-5 py-2 text-sm font-semibold text-white"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total revenue" value={formatMoney(summary.totalRevenue)} />
            <StatCard title="Total orders" value={String(summary.totalOrders ?? 0)} />
            <StatCard title="Avg order value" value={formatMoney(summary.avgOrderValue)} />
            <StatCard
              title="Top product"
              value={tp.name || "—"}
              subtitle={tp.revenue != null ? `Revenue ${formatMoney(tp.revenue)}` : undefined}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue by day</p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(v) => [formatMoney(v), "Revenue"]}
                      contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
                    />
                    <Bar dataKey="revenue" fill="#1d6fb8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue by category</p>
              <div className="mt-4 h-72 w-full">
                {pieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No category data for this range.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Daily breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {(byDay || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No orders in this range.
                      </td>
                    </tr>
                  ) : (
                    byDay.map((d) => (
                      <tr key={d.date}>
                        <td className="px-4 py-3 font-mono text-xs">{d.date}</td>
                        <td className="px-4 py-3 tabular-nums">{d.orders}</td>
                        <td className="px-4 py-3 tabular-nums">{formatMoney(d.revenue)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatMoney(d.avg)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
