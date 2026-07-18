"use client";

import { useEffect, useState } from "react";

/** Tiny live indicator for the dashboard toolbar. */
export function LiveUsersCard() {
  const [liveUsers, setLiveUsers] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/presence", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success || cancelled) return;
        setLiveUsers(Number(json.data?.liveUsers) || 0);
      } catch {
        if (!cancelled) setLiveUsers(0);
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

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/60"
      title="Active storefront visitors"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{display}</span>
      <span className="text-slate-400">live</span>
    </div>
  );
}
