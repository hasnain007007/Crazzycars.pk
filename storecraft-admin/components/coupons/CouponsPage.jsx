"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function CouponsPage() {
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, usedToday: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons?filter=${encodeURIComponent(filter)}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed");
        return;
      }
      setRows(json.coupons || []);
      if (json.stats) setStats(json.stats);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id, code) {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Delete failed");
        return;
      }
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Coupons &amp; Discounts</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage promotional codes</p>
        </div>
        <Link
          href="/coupons/new"
          className="inline-flex justify-center rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185d9c]"
        >
          Add coupon
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Active", stats.active],
          ["Expired", stats.expired],
          ["Used today", stats.usedToday],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">{k}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-600">Filter</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Min order</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                    <td className="px-4 py-3 capitalize">{c.discountType}</td>
                    <td className="px-4 py-3">
                      {c.discountType === "percentage" ? `${c.discountValue}%` : formatMoney(c.discountValue)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(c.minOrderAmount)}</td>
                    <td className="px-4 py-3">{formatDate(c.expiryDate)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.usedCount} / {c.usageLimit > 0 ? c.usageLimit : "∞"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.displayStatus === "active"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
                            : c.displayStatus === "expired"
                              ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                              : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800"
                        }
                      >
                        {c.displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/coupons/${c.id}`} className="text-xs font-semibold text-[#1d6fb8]">
                          Edit
                        </Link>
                        <button type="button" onClick={() => remove(c.id, c.code)} className="text-xs text-red-600">
                          Delete
                        </button>
                      </div>
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
