/**
 * Stock report data table with selection, expandable add-stock, and row actions.
 */
"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AddStockForm } from "./AddStockForm";
import { RequestPurchaseModal } from "./RequestPurchaseModal";

function StatusBadge({ status, trackInventory }) {
  if (!trackInventory) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Not tracked
      </span>
    );
  }
  if (status === "out") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200">
        Out of Stock
      </span>
    );
  }
  if (status === "low") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
      Healthy
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function StockTable({ products, onProductUpdated }) {
  const [selected, setSelected] = useState(() => new Set());
  const [expandId, setExpandId] = useState(null);
  const [purchaseProduct, setPurchaseProduct] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkPriority, setBulkPriority] = useState("medium");
  const [bulkQtyById, setBulkQtyById] = useState({});
  const [bulkSending, setBulkSending] = useState(false);

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const someSelected = products.some((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected]
  );

  const eligibleForPurchase = selectedProducts.filter(
    (p) => p.trackInventory && (p.status === "out" || p.status === "low")
  );

  function afterRowMutation(row) {
    onProductUpdated();
    setSelected((prev) => {
      const next = new Set(prev);
      if (row?.id) next.delete(row.id);
      return next;
    });
  }

  async function bulkExport() {
    const ids = [...selected];
    if (!ids.length) return;
    const q = new URLSearchParams({ ids: ids.join(",") });
    window.open(`/api/reports/stock/export?${q.toString()}`, "_blank", "noopener,noreferrer");
  }

  function openBulkPurchase() {
    if (!eligibleForPurchase.length) {
      toast.error("Select products that are low or out of stock.");
      return;
    }
    const init = {};
    for (const p of eligibleForPurchase) {
      const shortage = Math.max(0, p.threshold - p.quantity);
      init[p.id] = String(Math.max(shortage, 1));
    }
    setBulkQtyById(init);
    setBulkNotes("");
    setBulkPriority("medium");
    setBulkOpen(true);
  }

  async function submitBulkPurchase(e) {
    e.preventDefault();
    setBulkSending(true);
    try {
      for (const p of eligibleForPurchase) {
        const raw = bulkQtyById[p.id];
        const requestedQty = parseInt(raw, 10);
        if (!Number.isFinite(requestedQty) || requestedQty < 1) continue;
        await fetch("/api/reports/stock/request-purchase", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: p.id,
            requestedQty,
            notes: bulkNotes,
            priority: bulkPriority,
          }),
        });
      }
      onProductUpdated();
      toast.success("Purchase requests sent for selected products.");
      setSelected(new Set());
      setBulkOpen(false);
    } catch {
      toast.error("Some requests may have failed.");
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {someSelected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="font-medium text-amber-950 dark:text-amber-100">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={openBulkPurchase}
            disabled={!eligibleForPurchase.length}
            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Request purchase for selected
          </button>
          <button
            type="button"
            onClick={bulkExport}
            className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
          >
            Export selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-amber-900/80 underline dark:text-amber-200/90"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="rounded border-slate-300"
                />
              </th>
              <th className="w-14 px-2 py-3">Image</th>
              <th className="min-w-[140px] px-2 py-3">Product name</th>
              <th className="px-2 py-3">Article no.</th>
              <th className="min-w-[100px] px-2 py-3">Category</th>
              <th className="px-2 py-3">Current stock</th>
              <th className="px-2 py-3">Threshold</th>
              <th className="px-2 py-3">Status</th>
              <th className="min-w-[120px] px-2 py-3">Last updated</th>
              <th className="min-w-[200px] px-2 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                  No products match your filters.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="relative h-11 w-11 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                        {p.imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- admin arbitrary CDN URLs */}
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          </>
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="max-w-[200px] truncate">{p.name}</span>
                        {p.restockRequested ? (
                          <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
                            Requested
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-600 dark:text-slate-400">
                      {p.articleNo || "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 align-middle text-slate-600 dark:text-slate-400">
                      {p.categoryLabel}
                    </td>
                    <td className="px-2 py-2 align-middle font-medium tabular-nums">{p.quantity}</td>
                    <td className="px-2 py-2 align-middle tabular-nums text-slate-600 dark:text-slate-400">
                      {p.trackInventory ? p.threshold : "—"}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <StatusBadge status={p.status} trackInventory={p.trackInventory} />
                    </td>
                    <td className="px-2 py-2 align-middle text-xs text-slate-500">{formatDate(p.updatedAt)}</td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandId((cur) => (cur === p.id ? null : p.id))}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                        >
                          + Add stock
                        </button>
                        {p.trackInventory && (p.status === "out" || p.status === "low") ? (
                          <button
                            type="button"
                            onClick={() => setPurchaseProduct(p)}
                            className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                          >
                            Request purchase
                          </button>
                        ) : null}
                        <Link
                          href={`/catalog/products/${p.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Edit product"
                          aria-label="Edit product"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expandId === p.id ? (
                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                      <td colSpan={10} className="px-4 py-3">
                        <AddStockForm
                          product={p}
                          onSaved={(row) => {
                            afterRowMutation(row);
                            setExpandId(null);
                          }}
                          onCancel={() => setExpandId(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RequestPurchaseModal
        product={purchaseProduct}
        open={Boolean(purchaseProduct)}
        onClose={() => setPurchaseProduct(null)}
        onSaved={(row) => afterRowMutation(row)}
      />

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/50" onClick={() => setBulkOpen(false)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request purchase — selected</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {eligibleForPurchase.length} product(s) will receive a restock request.
            </p>
            <form onSubmit={submitBulkPurchase} className="mt-4 space-y-4">
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2 dark:border-slate-700">
                {eligibleForPurchase.map((p) => {
                  const shortage = Math.max(0, p.threshold - p.quantity);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                      <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        Qty
                        <input
                          type="number"
                          min={1}
                          className="w-20 rounded border border-slate-200 px-1 py-0.5 dark:border-slate-600 dark:bg-slate-800"
                          value={bulkQtyById[p.id] ?? ""}
                          onChange={(e) =>
                            setBulkQtyById((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                        />
                        <span className="text-slate-400">(short {shortage})</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Supplier / notes</label>
                <textarea
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={2}
                  className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <fieldset>
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority</legend>
                <div className="mt-1 flex gap-3 text-sm capitalize">
                  {["low", "medium", "high"].map((pr) => (
                    <label key={pr} className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="bulk-priority"
                        checked={bulkPriority === pr}
                        onChange={() => setBulkPriority(pr)}
                      />
                      {pr}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSending}
                  className="rounded-md bg-[#1d6fb8] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {bulkSending ? "Sending…" : "Send requests"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
