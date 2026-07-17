/**
 * Modal to request a purchase restock for one product.
 */
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function shortageUnits(qty, threshold) {
  const need = Number(threshold) - Number(qty);
  return need > 0 ? need : 0;
}

export function RequestPurchaseModal({ product, open, onClose, onSaved }) {
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sending, setSending] = useState(false);

  const z = product ? shortageUnits(product.quantity, product.threshold) : 0;

  useEffect(() => {
    if (open && product) {
      const suggest = Math.max(z, 1);
      setQty(String(suggest));
      setNotes("");
      setPriority("medium");
    }
  }, [open, product, z]);

  if (!open || !product) return null;

  async function send(e) {
    e.preventDefault();
    const n = parseInt(qty, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a valid requested quantity.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reports/stock/request-purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          requestedQty: n,
          notes,
          priority,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Request failed.");
        return;
      }
      toast.success("Purchase request sent!");
      onSaved(json.product);
      onClose();
    } catch {
      toast.error("Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restock-modal-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="restock-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
          Request Restock — {product.name}
        </h2>

        <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/80">
          <div className="flex justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-400">Current stock</span>
            <span className="font-medium text-slate-900 dark:text-white">{product.quantity} units</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-400">Threshold</span>
            <span className="font-medium text-slate-900 dark:text-white">{product.threshold} units</span>
          </div>
          <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-600">
            <span className="text-slate-600 dark:text-slate-400">Shortage</span>
            <span className="font-medium text-amber-800 dark:text-amber-200">{z} units needed</span>
          </div>
        </div>

        <form onSubmit={send} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="req-qty">
              Requested quantity
            </label>
            <input
              id="req-qty"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="req-notes">
              Supplier / notes
            </label>
            <textarea
              id="req-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <fieldset>
            <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority</legend>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {["low", "medium", "high"].map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 capitalize">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-[#1d6fb8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#185d9c] disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
