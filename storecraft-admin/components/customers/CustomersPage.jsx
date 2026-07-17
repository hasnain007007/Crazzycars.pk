"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, newThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (debounced) p.set("search", debounced);
    if (status !== "all") p.set("status", status);
    return p.toString();
  }, [page, debounced, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?${qs}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load");
        return;
      }
      setRows(json.customers || []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      if (json.stats) setStats(json.stats);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleBlock(customer) {
    const isCurrentlyBlocked =
      customer.status === "blocked" || customer.status === "inactive" || customer.isActive === false;

    const newStatus = isCurrentlyBlocked ? "active" : "blocked";
    const newIsActive = isCurrentlyBlocked ? true : false;

    const ok = window.confirm(
      newStatus === "blocked"
        ? `Block ${customer.name}? They won't be able to place orders.`
        : `Unblock ${customer.name}?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          isActive: newIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(isCurrentlyBlocked ? "Customer unblocked!" : "Customer blocked!");
      load();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function deleteCustomer(c) {
    const ok = window.confirm(`Delete ${c.name}? This cannot be undone. Their orders will remain.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Delete failed");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== c.id));
      setTotal((t) => Math.max(0, t - 1));
      const blocked =
        c.status === "blocked" || c.status === "inactive" || c.isActive === false;
      setStats((s) => ({
        ...s,
        total: Math.max(0, (s.total || 0) - 1),
        active: !blocked ? Math.max(0, (s.active || 0) - 1) : s.active,
        blocked: blocked ? Math.max(0, (s.blocked || 0) - 1) : s.blocked,
      }));
      toast.success("Customer deleted");
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{total} matching customers</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Active", stats.active],
          ["Blocked", stats.blocked],
          ["New this month", stats.newThisMonth],
        ].map(([label, val]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{val}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, or phone"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const isBlocked =
                    c.status === "blocked" || c.status === "inactive" || c.isActive === false;
                  return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.id.slice(-8)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(c.totalSpent)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          !isBlocked
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                            : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100"
                        }
                      >
                        {isBlocked ? "blocked" : "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.joinedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-[#1d6fb8] dark:border-slate-600"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(c)}
                          style={{
                            padding: "4px 10px",
                            background: isBlocked ? "#d1fae5" : "#fee2e2",
                            color: isBlocked ? "#065f46" : "#991b1b",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomer(c)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <span>
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}