/**
 * Recharts pie chart for order counts by fulfillment status.
 */
"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#64748b",
  refunded: "#ef4444",
};

const LABELS = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function OrderStatusPieChart({ counts }) {
  const c = counts || {};
  const data = Object.keys(LABELS)
    .map((key) => ({
      key,
      name: LABELS[key],
      value: Number(c[key]) || 0,
    }))
    .filter((d) => d.value > 0);

  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-border bg-white p-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No orders yet — chart will appear once orders exist.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Orders by status</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">All orders in the database</p>
      <div className="mt-2 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
