/**
 * Horizontal funnel / bar chart for order pipeline stages.
 */
"use client";

import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAGES = [
  { key: "ordersReceived", label: "Received", color: "#0ea5e9" },
  { key: "ordersDispatched", label: "Dispatched", color: "#8b5cf6" },
  { key: "ordersDelivered", label: "Delivered", color: "#22c55e" },
  { key: "ordersReturned", label: "Returned", color: "#f43f5e" },
];

function FunnelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.label}</p>
      <p className="mt-0.5 text-sm tabular-nums text-slate-600 dark:text-slate-300">
        {item.value} orders
        {item.share != null ? ` · ${item.share}% of received` : ""}
      </p>
    </div>
  );
}

export function OrderFunnelChart({ data, rangeLabel }) {
  const gradId = useId().replace(/:/g, "");
  const d = data || {};

  const rows = useMemo(() => {
    const received = Math.max(0, Number(d.ordersReceived) || 0);
    return STAGES.map((s) => {
      const value = Math.max(0, Number(d[s.key]) || 0);
      return {
        ...s,
        value,
        share: received > 0 ? Math.round((value / received) * 1000) / 10 : null,
      };
    });
  }, [d]);

  const hasAny = rows.some((r) => r.value > 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Fulfillment funnel</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pipeline · {rangeLabel || "Selected period"}
            </p>
          </div>
        </div>

        <div className="mt-3 h-56 w-full">
          {hasAny ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                <defs>
                  {rows.map((r) => (
                    <linearGradient key={r.key} id={`funnel-${gradId}-${r.key}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={r.color} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={r.color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={84}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                />
                <Tooltip content={<FunnelTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={22}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={`url(#funnel-${gradId}-${r.key})`} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-slate-600 text-xs font-semibold"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No funnel data in this period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
