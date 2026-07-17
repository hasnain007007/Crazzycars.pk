/**
 * Inline add-stock form for a single product row.
 */
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function AddStockForm({ product, onSaved, onCancel }) {
  const [addQty, setAddQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const n = parseInt(addQty, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a positive whole number to add.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reports/stock/add-stock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, addQuantity: n, note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not update stock.");
        return;
      }
      const updated = json.product;
      toast.success(`Stock updated! ${updated.name} now has ${updated.quantity} units`);
      onSaved(updated);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Current stock
          </label>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            {product.quantity}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor={`add-qty-${product.id}`}>
            Add quantity
          </label>
          <input
            id={`add-qty-${product.id}`}
            type="number"
            min={1}
            step={1}
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="0"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor={`add-note-${product.id}`}>
            Note (optional)
          </label>
          <input
            id={`add-note-${product.id}`}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Received from supplier"
            className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#1d6fb8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#185d9c] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
