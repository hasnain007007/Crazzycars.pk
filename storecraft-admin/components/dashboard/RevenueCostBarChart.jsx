/**
 * Revenue vs product cost by weekday (last 7 days).
 */
"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminPrice } from "@/lib/currency";

const GREEN = "#1A7A4C";
const ORANGE = "#E8913A";

function formatAxis(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(Math.round(v));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tabular-nums" style={{ color: p.color }}>
          {p.name}: {formatAdminPrice(Number(p.value) || 0)}
        </p>
      ))}
    </div>
  );
}

export function RevenueCostBarChart({ data }) {
  const rows = useMemo(
    () =>
      (data || []).map((d) => ({
        label: d.label,
        revenue: Number(d.revenue) || 0,
        cost: Number(d.cost) || 0,
      })),
    [data]
  );
  const hasData = rows.some((r) => r.revenue > 0 || r.cost > 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue vs cost</h3>
      <p className="text-xs text-slate-400">Last 7 days · paid orders</p>
      <div className="mt-4 h-56 w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-slate-950/50">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 6" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={formatAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="cost" name="Cost" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
