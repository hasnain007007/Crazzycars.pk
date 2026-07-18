"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_RANGES } from "@/lib/dashboardRanges";

/**
 * Clean period control: select + optional custom dates (no pill clutter).
 */
export function DashboardDateRange({ rangeId, from, to, onChange, loading }) {
  const [draftFrom, setDraftFrom] = useState(from || "");
  const [draftTo, setDraftTo] = useState(to || "");

  useEffect(() => {
    if (from) setDraftFrom(from);
    if (to) setDraftTo(to);
  }, [from, to]);

  const onSelect = (id) => {
    if (id === "custom") {
      onChange({ rangeId: "custom", from: draftFrom, to: draftTo });
      return;
    }
    onChange({ rangeId: id, from: "", to: "" });
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return;
    onChange({ rangeId: "custom", from: draftFrom, to: draftTo });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="dashboard-range">
        Period
      </label>
      <select
        id="dashboard-range"
        value={rangeId}
        disabled={loading}
        onChange={(e) => onSelect(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {DASHBOARD_RANGES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>

      {rangeId === "custom" ? (
        <>
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={applyCustom}
            disabled={loading || !draftFrom || !draftTo}
            className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            Apply
          </button>
        </>
      ) : null}
    </div>
  );
}
