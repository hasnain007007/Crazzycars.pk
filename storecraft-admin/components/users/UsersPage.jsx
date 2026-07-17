"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { roleBadgeClass } from "@/lib/userUi";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export function UsersPage() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, u] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/users", { credentials: "include" }).then((r) => r.json()),
      ]);
      if (m.success) setMe(m.user);
      if (!u.success) {
        toast.error(u.error || "Failed to load users");
        setUsers([]);
      } else setUsers(u.users || []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isSuper = me?.role === "superadmin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team members</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Admin accounts</p>
        </div>
        {isSuper ? (
          <Link
            href="/users/new"
            className="inline-flex justify-center rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Add user
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.status}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.lastLogin)}</td>
                  <td className="px-4 py-3 text-right">
                    {isSuper ? (
                      <div className="flex justify-end gap-2">
                        <Link href={`/users/${u.id}`} className="text-xs font-semibold text-[#1d6fb8]">
                          Edit
                        </Link>
                        {me?.id !== u.id ? (
                          <button
                            type="button"
                            className="text-xs text-amber-700"
                            onClick={async () => {
                              if (!window.confirm("Deactivate this user?")) return;
                              const res = await fetch(`/api/users/${u.id}`, {
                                method: "PUT",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "inactive" }),
                              });
                              const json = await res.json();
                              if (!res.ok || !json.success) toast.error(json.error || "Failed");
                              else {
                                toast.success("Updated");
                                load();
                              }
                            }}
                          >
                            Deactivate
                          </button>
                        ) : null}
                        {me?.id !== u.id ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-600"
                            onClick={async () => {
                              if (!window.confirm(`Permanently delete ${u.name || u.email}? This cannot be undone.`)) return;
                              const res = await fetch(`/api/users/${u.id}`, {
                                method: "DELETE",
                                credentials: "include",
                              });
                              const json = await res.json();
                              if (!res.ok || !json.success) toast.error(json.error || "Failed to delete");
                              else {
                                toast.success("User deleted");
                                load();
                              }
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
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
