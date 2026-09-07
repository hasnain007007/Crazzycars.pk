"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const BAR_COLORS = {
  chatgpt: "#10a37f",
  copilot: "#0078d4",
  perplexity: "#20808d",
  claude: "#d97757",
  gemini: "#4285f4",
  grok: "#111111",
  meta: "#0668E1",
  deepseek: "#4D6BFE",
  you: "#6b21a8",
  google_extended: "#34a853",
  bing: "#008373",
  apple: "#555555",
  amazon: "#FF9900",
  bytespider: "#fe2c55",
  other_ai: "#94a3b8",
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

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatPkr(n) {
  const v = Math.round(Number(n) || 0);
  return `Rs. ${v.toLocaleString("en-PK")}`;
}

/**
 * AI traffic + estimated order/revenue attribution (30-day first-touch cookie).
 */
export function AiAgentTrafficCard() {
  const customDefaults = useMemo(() => defaultCustomWindow(), []);
  const [preset, setPreset] = useState("30"); // "7" | "30" | "custom"
  const [customFrom, setCustomFrom] = useState(customDefaults.from);
  const [customTo, setCustomTo] = useState(customDefaults.to);
  const [appliedFrom, setAppliedFrom] = useState(customDefaults.from);
  const [appliedTo, setAppliedTo] = useState(customDefaults.to);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodLabel, setPeriodLabel] = useState("Last 30 days");
  const [selectedSource, setSelectedSource] = useState(null);
  const [windowDays, setWindowDays] = useState(30);
  const [data, setData] = useState({
    total: 0,
    attributedOrders: 0,
    attributedRevenue: 0,
    bySource: [],
    recentQueries: [],
    attributedOrdersList: [],
  });

  const queryString = useMemo(() => {
    if (preset === "custom") {
      const params = new URLSearchParams();
      if (appliedFrom) params.set("from", appliedFrom);
      if (appliedTo) params.set("to", appliedTo);
      return params.toString();
    }
    return `days=${preset}`;
  }, [preset, appliedFrom, appliedTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/analytics/ai-visits?${queryString}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load AI traffic.");
        setData({
          total: 0,
          attributedOrders: 0,
          attributedRevenue: 0,
          bySource: [],
          recentQueries: [],
          attributedOrdersList: [],
        });
        return;
      }
      setPeriodLabel(json.data?.label || (preset === "custom" ? "Custom range" : `Last ${preset} days`));
      setWindowDays(Number(json.data?.attributionWindowDays) || 30);
      setData({
        total: Number(json.data?.total) || 0,
        attributedOrders: Number(json.data?.attributedOrders) || 0,
        attributedRevenue: Number(json.data?.attributedRevenue) || 0,
        bySource: Array.isArray(json.data?.bySource) ? json.data.bySource : [],
        recentQueries: Array.isArray(json.data?.recentQueries) ? json.data.recentQueries : [],
        attributedOrdersList: Array.isArray(json.data?.attributedOrdersList)
          ? json.data.attributedOrdersList
          : [],
      });
    } catch {
      setError("Could not load AI traffic.");
      setData({
        total: 0,
        attributedOrders: 0,
        attributedRevenue: 0,
        bySource: [],
        recentQueries: [],
        attributedOrdersList: [],
      });
    } finally {
      setLoading(false);
    }
  }, [queryString, preset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedSource(null);
  }, [queryString]);

  const selectPreset = (next) => {
    setPreset(next);
    if (next === "custom") {
      setAppliedFrom(customFrom);
      setAppliedTo(customTo);
    }
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    setAppliedFrom(customFrom);
    setAppliedTo(customTo);
    setPreset("custom");
  };

  const filteredOrders = useMemo(() => {
    const list = data.attributedOrdersList || [];
    if (!selectedSource) return list;
    return list.filter((o) => o.source === selectedSource);
  }, [data.attributedOrdersList, selectedSource]);

  const selectedLabel =
    data.bySource.find((r) => r.source === selectedSource)?.label || selectedSource || "";

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        loading ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI agent traffic</h3>
          <p className="text-xs text-slate-400">
            Estimated attribution based on a {windowDays}-day first-touch session window (chat
            referrer or UTM) — not guaranteed. Loses accuracy if someone switches devices, clears
            cookies, or buys after the window. Click a source with orders to see which orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-700">
            {[
              { id: "7", label: "7d" },
              { id: "30", label: "30d" },
              { id: "custom", label: "Custom" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectPreset(opt.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  preset === opt.id
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="sr-only" htmlFor="ai-traffic-from">
                From date
              </label>
              <input
                id="ai-traffic-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-400">to</span>
              <label className="sr-only" htmlFor="ai-traffic-to">
                To date
              </label>
              <input
                id="ai-traffic-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={applyCustom}
                disabled={loading || !customFrom || !customTo}
                className="h-8 rounded-lg bg-slate-900 px-2.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                Apply
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Visits</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {loading && data.total === 0 ? "…" : data.total.toLocaleString("en-PK")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSource(null)}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-800"
              title="Show all attributed orders"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Orders</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {loading && data.attributedOrders === 0
                  ? "…"
                  : data.attributedOrders.toLocaleString("en-PK")}
              </p>
            </button>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/80">
                Revenue
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100 sm:text-2xl">
                {loading && data.attributedRevenue === 0 ? "…" : formatPkr(data.attributedRevenue)}
              </p>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Period · {periodLabel}</p>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                By source
              </p>
              {data.bySource.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-2 font-medium">Source</th>
                        <th className="pb-2 pr-2 text-right font-medium">Visits</th>
                        <th className="pb-2 pr-2 text-right font-medium">Orders</th>
                        <th className="pb-2 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.bySource.map((row) => {
                        const active = selectedSource === row.source;
                        const clickable = Number(row.orders) > 0;
                        return (
                          <tr
                            key={row.source}
                            className={active ? "bg-emerald-50/70 dark:bg-emerald-950/30" : ""}
                          >
                            <td className="py-2.5 pr-2">
                              <button
                                type="button"
                                disabled={!clickable}
                                onClick={() =>
                                  setSelectedSource((prev) =>
                                    prev === row.source ? null : row.source
                                  )
                                }
                                className={`flex w-full items-center gap-2 text-left ${
                                  clickable
                                    ? "cursor-pointer hover:opacity-90"
                                    : "cursor-default opacity-90"
                                }`}
                                title={
                                  clickable
                                    ? `Show ${row.orders} order(s) from ${row.label}`
                                    : undefined
                                }
                              >
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    background: BAR_COLORS[row.source] || BAR_COLORS.other_ai,
                                  }}
                                />
                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                  {row.label}
                                  {clickable ? (
                                    <span className="ml-1 text-[10px] font-normal text-emerald-700">
                                      view orders →
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(row.percent > 0 ? 2 : 0, row.percent))}%`,
                                    background: BAR_COLORS[row.source] || BAR_COLORS.other_ai,
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                              {(row.visits ?? row.count ?? 0).toLocaleString("en-PK")}
                            </td>
                            <td className="py-2.5 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                              <button
                                type="button"
                                disabled={!clickable}
                                onClick={() =>
                                  setSelectedSource((prev) =>
                                    prev === row.source ? null : row.source
                                  )
                                }
                                className={
                                  clickable
                                    ? "font-semibold text-emerald-700 underline-offset-2 hover:underline"
                                    : ""
                                }
                              >
                                {row.orders || 0}
                              </button>
                            </td>
                            <td className="py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                              {formatPkr(row.revenue || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-400">
                  {loading ? "Loading…" : "No AI agent visits or attributed orders in this period yet"}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {selectedSource ? `${selectedLabel} orders` : "Attributed orders"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {selectedSource
                      ? "Orders first-touched from this AI source in the selected period."
                      : "All AI-attributed orders in the period. Click a source to filter."}
                  </p>
                </div>
                {selectedSource ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSource(null)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Show all
                  </button>
                ) : null}
              </div>

              {filteredOrders.length > 0 ? (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-emerald-700">{o.orderNumber || o.id}</p>
                          <p className="truncate text-slate-600 dark:text-slate-300">
                            {o.customerName || "Guest"}
                            {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            via {o.sourceLabel} · {formatWhen(o.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {o.total != null ? (
                            <p className="font-semibold tabular-nums text-slate-900 dark:text-white">
                              {formatPkr(o.total)}
                            </p>
                          ) : null}
                          <p className="text-[10px] capitalize text-slate-500">{o.orderStatus}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : data.recentQueries.length > 0 && !selectedSource && data.attributedOrders === 0 ? (
                <>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recent referrer queries
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Only when the referrer URL included a query — most AI links do not.
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[280px] text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                          <th className="pb-2 pr-3 font-medium">Query</th>
                          <th className="pb-2 pr-3 font-medium">Source</th>
                          <th className="pb-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.recentQueries.map((row, i) => (
                          <tr key={`${row.createdAt}-${i}`}>
                            <td className="max-w-[240px] truncate py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                              {row.query}
                            </td>
                            <td className="whitespace-nowrap py-2 pr-3 text-slate-500">
                              {row.sourceLabel}
                            </td>
                            <td className="whitespace-nowrap py-2 text-slate-400">
                              {formatWhen(row.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-sm text-slate-400">
                  {loading
                    ? "Loading…"
                    : selectedSource
                      ? `No orders attributed to ${selectedLabel} in this period.`
                      : "No AI-attributed orders in this period yet."}
                </p>
              )}

              {data.recentQueries.length > 0 &&
              (filteredOrders.length > 0 || data.attributedOrders > 0) ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recent referrer queries
                  </summary>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
                    {data.recentQueries.slice(0, 8).map((row, i) => (
                      <li key={`q-${i}`}>
                        <span className="font-medium">{row.query}</span>
                        <span className="text-slate-400">
                          {" "}
                          · {row.sourceLabel} · {formatWhen(row.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
