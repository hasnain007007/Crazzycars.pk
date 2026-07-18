/**
 * Sales by category donut.
 */
"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatAdminPrice } from "@/lib/currency";

const COLORS = ["#1A7A4C", "#E8913A", "#2D9B63", "#94A3B8", "#0F766E", "#CA8A04"];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
      <p className="tabular-nums text-slate-600">
        {formatAdminPrice(p.value)} · {p.percent}%
      </p>
    </div>
  );
}

export function CategorySalesDonut({ data }) {
  const rows = useMemo(
    () =>
      (data || [])
        .filter((d) => Number(d.value) > 0)
        .map((d) => ({
          name: d.name,
          value: Number(d.value) || 0,
          percent: Number(d.percent) || 0,
        })),
    [data]
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sales by category</h3>
      <p className="text-xs text-slate-400">Period sell mix</p>
      <div className="mt-2 flex h-56 flex-col items-center sm:flex-row">
        {!rows.length ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No category data
          </div>
        ) : (
          <>
            <div className="h-44 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {rows.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2 sm:w-1/2">
              {rows.map((r, i) => (
                <li key={r.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate">{r.name}</span>
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                    {r.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
