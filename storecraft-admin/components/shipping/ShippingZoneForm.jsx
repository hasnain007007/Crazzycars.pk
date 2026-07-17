"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PAKISTAN_PROVINCES } from "@/lib/constants";

function emptyRate() {
  return {
    name: "Standard",
    price: 0,
    pricePerKg: 0,
    baseWeightIncluded: 0,
    minDays: 1,
    maxDays: 5,
    freeShippingOver: 0,
  };
}

export function ShippingZoneForm({ zoneId }) {
  const router = useRouter();
  const isEdit = Boolean(zoneId);
  const [zoneName, setZoneName] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [status, setStatus] = useState("active");
  const [rates, setRates] = useState([emptyRate()]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!zoneId) return;
    const res = await fetch(`/api/shipping/${zoneId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Not found.");
      return;
    }
    const z = json.zone;
    setZoneName(z.name || z.zoneName || "");
    setProvinces(
      Array.isArray(z.provinces) ? z.provinces : Array.isArray(z.countries) ? z.countries : []
    );
    setStatus(z.status || "active");
    if (Array.isArray(z.rates) && z.rates.length > 0) {
      setRates(
        z.rates.map((r) => ({
          name: r.name || "Standard",
          price: Number(r.price) || 0,
          pricePerKg: Number(r.pricePerKg) || 0,
          baseWeightIncluded: Number(r.baseWeightIncluded) || 0,
          minDays: Number(r.minDays) || 0,
          maxDays: Number(r.maxDays) || 0,
          freeShippingOver: Number(r.freeShippingOver) || 0,
        }))
      );
    } else {
      setRates([emptyRate()]);
    }
  }, [zoneId]);

  useEffect(() => {
    if (zoneId) load();
  }, [zoneId, load]);

  function toggleProvince(prov) {
    setProvinces((prev) => (prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]));
  }

  function selectAllProvinces() {
    setProvinces((prev) => (prev.length === PAKISTAN_PROVINCES.length ? [] : [...PAKISTAN_PROVINCES]));
  }

  function updateRate(i, field, value) {
    setRates((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addRate() {
    setRates((prev) => [...prev, emptyRate()]);
  }

  function removeRate(i) {
    setRates((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: zoneName, provinces, status, rates };
      const url = isEdit ? `/api/shipping/${zoneId}` : "/api/shipping";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed.");
        return;
      }
      toast.success("Saved.");
      router.push("/shipping");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/shipping" className="text-sm text-[#1d6fb8] hover:underline">
        ← Shipping
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit zone" : "New zone"}</h1>
      <form onSubmit={save} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Zone name</label>
              <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. Punjab & Major Cities"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                required
              />
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
              <label className="mt-2 flex cursor-pointer items-center gap-3">
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-200 has-[:checked]:bg-emerald-500 dark:bg-slate-600">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={status === "active"}
                    onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
                  />
                  <span className="ml-1 inline-block h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium capitalize">{status}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Provinces in this Zone</h2>
            <button
              type="button"
              onClick={selectAllProvinces}
              className="text-xs font-medium text-[#1d6fb8] hover:underline"
            >
              {provinces.length === PAKISTAN_PROVINCES.length ? "Clear All" : "Select All"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PAKISTAN_PROVINCES.map((prov) => (
              <label key={prov} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={provinces.includes(prov)}
                  onChange={() => toggleProvince(prov)}
                  className="rounded border-slate-300"
                />
                {prov}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Shipping rates</h2>
            <button type="button" onClick={addRate} className="text-sm font-medium text-[#1d6fb8] hover:underline">
              + Add rate
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {rates.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                <div className="mb-3 flex justify-end">
                  {rates.length > 1 ? (
                    <button type="button" onClick={() => removeRate(i)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-500">Name</label>
                    <input
                      value={r.name}
                      onChange={(e) => updateRate(i, "name", e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Price (Rs.)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.price}
                      onChange={(e) => updateRate(i, "price", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Price per kg (Rs.)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.pricePerKg ?? 0}
                      onChange={(e) => updateRate(i, "pricePerKg", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Extra charge per kg over base weight</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Base weight included (kg)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.baseWeightIncluded ?? 0}
                      onChange={(e) => updateRate(i, "baseWeightIncluded", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Weight included in flat rate price</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Min days</label>
                    <input
                      type="number"
                      min={0}
                      value={r.minDays}
                      onChange={(e) => updateRate(i, "minDays", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Max days</label>
                    <input
                      type="number"
                      min={0}
                      value={r.maxDays}
                      onChange={(e) => updateRate(i, "maxDays", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="text-xs text-slate-500">Free shipping over (Rs.)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.freeShippingOver}
                      onChange={(e) => updateRate(i, "freeShippingOver", Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full max-w-xl rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save zone"}
        </button>
      </form>
    </div>
  );
}
