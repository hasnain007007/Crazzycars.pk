/**
 * Revenue trend — forest green area chart (reference style).
 */
"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminPrice } from "@/lib/currency";

const GREEN = "#1A7A4C";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold tabular-nums" style={{ color: GREEN }}>
        {formatAdminPrice(Number(payload[0]?.value) || 0)}
      </p>
    </div>
  );
}

function formatAxis(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(Math.round(v));
}

export function SalesTrendChart({ data, rangeLabel, chartMode }) {
  const gradId = useId().replace(/:/g, "");
  const rows = useMemo(
    () =>
      (data || []).map((d) => ({
        label: d.label,
        revenue: Number(d.revenue) || 0,
      })),
    [data]
  );

  const total = useMemo(() => rows.reduce((s, r) => s + r.revenue, 0), [rows]);
  const hasRevenue = total > 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sales trend</h3>
          <p className="text-xs text-slate-400">
            Paid revenue · {rangeLabel || "Period"}
            {chartMode === "week" ? " · weekly" : ""}
          </p>
        </div>
        {hasRevenue ? (
          <p className="text-sm font-bold tabular-nums" style={{ color: GREEN }}>
            {formatAdminPrice(total)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 h-56 w-full">
        {!rows.length || !hasRevenue ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950/50">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No paid revenue yet</p>
            <p className="mt-1 max-w-xs text-center text-xs text-slate-400">
              Chart appears once orders are marked paid.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`rev-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={formatAxis}
                domain={[0, "auto"]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={GREEN}
                strokeWidth={2.5}
                fill={`url(#rev-${gradId})`}
                dot={{ r: 3, fill: GREEN, stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: GREEN, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
