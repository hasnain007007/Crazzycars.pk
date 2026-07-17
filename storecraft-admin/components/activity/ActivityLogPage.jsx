"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TYPES = [
  "all",
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "customer",
  "coupon",
  "user",
  "review",
  "banner",
  "blog",
  "settings",
];

export function ActivityLogPage() {
  const [user, setUser] = useState("");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    if (user.trim()) p.set("user", user.trim());
    if (type !== "all") p.set("type", type);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [page, user, type, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity-log?${qs}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed");
        return;
      }
      setLogs(json.logs || []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [user, type, from, to]);

  function exportCsv() {
    const p = new URLSearchParams();
    if (user.trim()) p.set("user", user.trim());
    if (type !== "all") p.set("type", type);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    window.open(`/api/activity-log/export?${p.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity log</h1>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800"
        >
          Export CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <input
          placeholder="User name or ID"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="min-w-[160px] flex-1 rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border px-2 py-2 text-sm dark:bg-slate-800">
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border px-2 py-2 text-sm dark:bg-slate-800" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border px-2 py-2 text-sm dark:bg-slate-800" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Resource</th>
              <th className="px-3 py-3">Details</th>
              <th className="px-3 py-3">IP</th>
              <th className="px-3 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No log entries.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.userName}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2">
                    {l.resource} {l.resourceId ? `#${l.resourceId.slice(-6)}` : ""}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-slate-600">
                    {typeof l.details === "object" ? JSON.stringify(l.details) : String(l.details || "")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.ip || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div className="flex justify-between border-t px-4 py-2 text-sm dark:border-slate-800">
            <span>
              Page {page} / {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">
                Prev
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
