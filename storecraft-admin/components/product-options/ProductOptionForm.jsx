"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TagInput } from "@/components/ui/TagInput";

export function ProductOptionForm({ optionId }) {
  const router = useRouter();
  const isEdit = Boolean(optionId);
  const [name, setName] = useState("");
  const [values, setValues] = useState([]);
  const [trackInventory, setTrackInventory] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!optionId) return;
    const res = await fetch(`/api/product-options/${optionId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Not found.");
      return;
    }
    const o = json.option;
    setName(o.name || "");
    setValues(Array.isArray(o.values) ? o.values : []);
    setTrackInventory(Boolean(o.trackInventory));
    setSortOrder(Number(o.sortOrder) || 0);
    setStatus(o.status || "active");
  }, [optionId]);

  useEffect(() => {
    if (optionId) load();
  }, [optionId, load]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name, values, trackInventory, sortOrder, status };
      const url = isEdit ? `/api/product-options/${optionId}` : "/api/product-options";
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
      router.push("/product-options");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/product-options" className="text-sm text-[#1d6fb8] hover:underline">
        ← Product options
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit option" : "New option"}</h1>
      <form onSubmit={save} className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Option name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            placeholder="e.g. Color"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Values</label>
          <div className="mt-2">
            <TagInput value={values} onChange={setValues} placeholder="Type value, Enter" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="rounded border-slate-300"
            />
            Track inventory
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Sort order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div>
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
