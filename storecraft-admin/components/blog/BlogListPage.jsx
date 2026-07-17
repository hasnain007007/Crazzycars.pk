"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export function BlogListPage() {
  const [status, setStatus] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?status=${encodeURIComponent(status)}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error("Failed");
        return;
      }
      setPosts(json.posts || []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id, title) {
    if (!window.confirm(`Delete blog "${title}"?`)) return;
    const res = await fetch(`/api/blog/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error("Failed");
    else {
      toast.success("Deleted");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Blogs</h1>
        </div>
        <Link href="/blog-manager/new" className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white">
          Add blog
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-600">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 rounded-lg border px-3 py-2 text-sm dark:bg-slate-800">
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No blogs.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">{(p.categories || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">{p.authorName}</td>
                  <td className="space-x-2 px-4 py-3 text-right text-xs">
                    <Link href={`/blog-manager/${p.id}`} className="text-[#1d6fb8]">
                      Edit
                    </Link>
                    <button type="button" className="text-red-600" onClick={() => remove(p.id, p.title)}>
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
  );
}
