"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getStorefrontPageUrl } from "@/lib/storefrontUrl";

export function PageListPage() {
  const [status, setStatus] = useState("all");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages-manager?status=${encodeURIComponent(status)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load pages.");
        return;
      }
      setPages(json.pages || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id, title) {
    if (!window.confirm(`Delete page "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/pages-manager/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error(json.error || "Delete failed.");
    else {
      toast.success("Page deleted.");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pages</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Static pages: About, Contact, Legal, etc.</p>
        </div>
        <Link
          href="/pages-manager/new"
          className="inline-flex justify-center rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
        >
          Add page
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No pages yet.
                  </td>
                </tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.slug}</td>
                    <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-300">{p.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="space-x-3 px-4 py-3 text-right text-xs">
                      {p.status === "published" && p.slug ? (
                        <a
                          href={getStorefrontPageUrl(p.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Preview
                        </a>
                      ) : null}
                      <Link href={`/pages-manager/${p.id}`} className="font-medium text-[#1d6fb8] hover:underline">
                        Edit
                      </Link>
                      <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => remove(p.id, p.title)}>
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
