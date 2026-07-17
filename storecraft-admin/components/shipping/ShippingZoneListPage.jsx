"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { countryLabel } from "@/lib/countries";

export function ShippingZoneListPage() {
  const [status, setStatus] = useState("all");
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shipping?status=${encodeURIComponent(status)}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load zones.");
        return;
      }
      setZones(json.zones || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id, name) {
    if (!window.confirm(`Delete shipping zone "${name}"?`)) return;
    const res = await fetch(`/api/shipping/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error(json.error || "Delete failed.");
    else {
      toast.success("Deleted.");
      load();
    }
  }

  function countriesPreview(codes) {
    const c = Array.isArray(codes) ? codes : [];
    if (c.length === 0) return "—";
    const labels = c.slice(0, 5).map((code) => countryLabel(code));
    return c.length > 5 ? `${labels.join(", ")}…` : labels.join(", ");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shipping zones</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Countries and delivery rates.</p>
        </div>
        <Link href="/shipping/new" className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white">
          Add zone
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3">Zone name</th>
                <th className="px-4 py-3">Countries</th>
                <th className="px-4 py-3">Rates count</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No zones yet.
                  </td>
                </tr>
              ) : (
                zones.map((z) => (
                  <tr key={z.id}>
                    <td className="px-4 py-3 font-medium">{z.zoneName}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600 dark:text-slate-400">{countriesPreview(z.countries)}</td>
                    <td className="px-4 py-3 tabular-nums">{(z.rates || []).length}</td>
                    <td className="px-4 py-3 capitalize">{z.status}</td>
                    <td className="space-x-3 px-4 py-3 text-right text-xs">
                      <Link href={`/shipping/${z.id}`} className="font-medium text-[#1d6fb8] hover:underline">
                        Edit
                      </Link>
                      <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => remove(z.id, z.zoneName)}>
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
