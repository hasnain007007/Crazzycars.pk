/**
 * Order status mix — compact donut + tidy legend.
 */
"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  processing: "#3b82f6",
  packed: "#6366f1",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  returned: "#f97316",
  cancelled: "#94a3b8",
  refunded: "#ef4444",
  disputed: "#fb923c",
};

const LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Dispatched",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
      <p className="text-xs text-slate-500">
        {item.value} · {item.pct}%
      </p>
    </div>
  );
}

export function OrderStatusPieChart({ counts, rangeLabel }) {
  const { data, total } = useMemo(() => {
    const c = counts || {};
    const raw = Object.keys(LABELS)
      .map((key) => ({
        key,
        name: LABELS[key],
        value: Number(c[key]) || 0,
        color: COLORS[key] || "#94a3b8",
      }))
      .filter((d) => d.value > 0);
    const sum = raw.reduce((s, d) => s + d.value, 0);
    return {
      total: sum,
      data: raw.map((d) => ({
        ...d,
        pct: sum ? Math.round((d.value / sum) * 1000) / 10 : 0,
      })),
    };
  }, [counts]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Order mix</h3>
      <p className="text-xs text-slate-400">{rangeLabel || "Period"}</p>

      {!data.length ? (
        <div className="mt-6 flex h-52 flex-col items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-950/50">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No orders</p>
          <p className="mt-1 text-xs text-slate-400">Nothing in this period yet</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-44 w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Orders</p>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{total}</p>
            </div>
          </div>

          <ul className="mt-2 space-y-2">
            {data.map((row) => (
              <li key={row.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                  {row.name}
                </span>
                <span className="tabular-nums text-slate-500">
                  {row.value}
                  <span className="ml-1 text-slate-400">({row.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
