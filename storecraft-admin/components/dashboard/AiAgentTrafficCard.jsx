"use client";

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
 * AI traffic + estimated order/revenue attribution (14-day first-touch cookie).
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
  const [data, setData] = useState({
    total: 0,
    attributedOrders: 0,
    attributedRevenue: 0,
    bySource: [],
    recentQueries: [],
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
        });
        return;
      }
      setPeriodLabel(json.data?.label || (preset === "custom" ? "Custom range" : `Last ${preset} days`));
      setData({
        total: Number(json.data?.total) || 0,
        attributedOrders: Number(json.data?.attributedOrders) || 0,
        attributedRevenue: Number(json.data?.attributedRevenue) || 0,
        bySource: Array.isArray(json.data?.bySource) ? json.data.bySource : [],
        recentQueries: Array.isArray(json.data?.recentQueries) ? json.data.recentQueries : [],
      });
    } catch {
      setError("Could not load AI traffic.");
      setData({
        total: 0,
        attributedOrders: 0,
        attributedRevenue: 0,
        bySource: [],
        recentQueries: [],
      });
    } finally {
      setLoading(false);
    }
  }, [queryString, preset]);

  useEffect(() => {
    load();
  }, [load]);

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
            Estimated attribution based on a 14-day first-touch session window — not guaranteed, but a
            reasonable signal. Loses accuracy if someone switches devices, clears cookies, or buys
            after the window.
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
                {loading && data.total === 0 ? "…" : data.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Orders</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {loading && data.attributedOrders === 0 ? "…" : data.attributedOrders}
              </p>
            </div>
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
                      {data.bySource.map((row) => (
                        <tr key={row.source}>
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ background: BAR_COLORS[row.source] || BAR_COLORS.other_ai }}
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {row.label}
                              </span>
                            </div>
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
                            {row.visits ?? row.count ?? 0}
                          </td>
                          <td className="py-2.5 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {row.orders || 0}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                            {formatPkr(row.revenue || 0)}
                          </td>
                        </tr>
                      ))}
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
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Recent referrer queries
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Only when the referrer URL included a query — most AI links do not.
              </p>
              {data.recentQueries.length > 0 ? (
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
                          <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{row.sourceLabel}</td>
                          <td className="whitespace-nowrap py-2 text-slate-400">
                            {formatWhen(row.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-400">
                  {loading ? "Loading…" : "No referrer queries captured yet"}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
