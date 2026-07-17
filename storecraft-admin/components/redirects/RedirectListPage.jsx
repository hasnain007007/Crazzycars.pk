"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export function RedirectListPage() {
  const [redirects, setRedirects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [type, setType] = useState(301);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/redirects", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load redirects.");
        return;
      }
      setRedirects(json.redirects || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addInline(e) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/redirects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath, toPath, type }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not add redirect.");
        return;
      }
      toast.success("Redirect added.");
      setFromPath("");
      setToPath("");
      setType(301);
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id, from) {
    if (!window.confirm(`Delete redirect ${from}?`)) return;
    const res = await fetch(`/api/redirects/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error(json.error || "Delete failed.");
    else {
      toast.success("Deleted.");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Redirects</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">301/302 rules for old URLs.</p>
      </div>

      <form
        onSubmit={addInline}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:flex-row md:flex-wrap md:items-end"
      >
        <div className="min-w-0 flex-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">From</label>
          <input
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            placeholder="/old-path"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">To</label>
          <input
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            placeholder="/new-path"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 md:w-28"
          >
            <option value={301}>301</option>
            <option value={302}>302</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-[#1d6fb8] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3">From path</th>
                <th className="px-4 py-3">To path</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : redirects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    No redirects yet.
                  </td>
                </tr>
              ) : (
                redirects.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.fromPath}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{r.toPath}</td>
                    <td className="px-4 py-3 tabular-nums">{r.type}</td>
                    <td className="space-x-3 px-4 py-3 text-right text-xs">
                      <Link href={`/redirects/${r.id}`} className="font-medium text-[#1d6fb8] hover:underline">
                        Edit
                      </Link>
                      <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => remove(r.id, r.fromPath)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
