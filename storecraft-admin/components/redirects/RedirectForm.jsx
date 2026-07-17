"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export function RedirectForm({ redirectId }) {
  const router = useRouter();
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [type, setType] = useState(301);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!redirectId) return;
    const res = await fetch(`/api/redirects/${redirectId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Not found.");
      return;
    }
    const r = json.redirect;
    setFromPath(r.fromPath || "");
    setToPath(r.toPath || "");
    setType(r.type === 302 ? 302 : 301);
  }, [redirectId]);

  useEffect(() => {
    if (redirectId) load();
  }, [redirectId, load]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/redirects/${redirectId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath, toPath, type }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed.");
        return;
      }
      toast.success("Saved.");
      router.push("/redirects");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/redirects" className="text-sm text-[#1d6fb8] hover:underline">
        ← Redirects
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit redirect</h1>
      <form onSubmit={save} className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">From path</label>
          <input
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">To path</label>
          <input
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value={301}>301 Permanent</option>
            <option value={302}>302 Temporary</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
