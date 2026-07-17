/**
 * Recharts line chart for revenue over the last 7 days.
 */
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminPrice } from "@/lib/currency";

export function SalesTrendChart({ data }) {
  const rows = (data || []).map((d) => ({
    label: d.label,
    revenue: Number(d.revenue) || 0,
  }));

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Sales trend</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days (paid orders)</p>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip
              formatter={(v) => [formatAdminPrice(v), "Revenue"]}
              contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#1d6fb8" strokeWidth={2} dot={{ r: 3, fill: "#1d6fb8" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
