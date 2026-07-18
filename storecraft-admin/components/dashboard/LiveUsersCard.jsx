"use client";

import { useEffect, useState } from "react";

/** Live storefront visitors — prominent card for the redesigned dashboard. */
export function LiveUsersCard({ variant = "badge" }) {
  const [liveUsers, setLiveUsers] = useState(null);
  const [topPaths, setTopPaths] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/presence", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success || cancelled) return;
        setLiveUsers(Number(json.data?.liveUsers) || 0);
        setTopPaths(Array.isArray(json.data?.topPaths) ? json.data.topPaths.slice(0, 3) : []);
      } catch {
        if (!cancelled) {
          setLiveUsers(0);
          setTopPaths([]);
        }
      }
    }

    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const display = liveUsers == null ? "…" : String(liveUsers);

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400">
              Currently live
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {display}
            </p>
            <p className="mt-1 text-xs text-slate-500">people on the storefront now</p>
          </div>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </div>
        {topPaths.length ? (
          <ul className="mt-4 space-y-1 border-t border-emerald-100 pt-3 dark:border-emerald-900/50">
            {topPaths.map((p) => (
              <li key={p.path} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span className="truncate font-mono">{p.path || "/"}</span>
                <span className="tabular-nums text-slate-400">{p.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs dark:border-emerald-800 dark:bg-emerald-950/50"
      title="Active storefront visitors"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{display}</span>
      <span className="font-medium text-emerald-700/70 dark:text-emerald-400/80">live now</span>
    </div>
  );
}
