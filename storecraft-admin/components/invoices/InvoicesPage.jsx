/**
 * Invoices list — separate from Orders.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";
import { downloadInvoicePdf } from "@/lib/downloadInvoicePdf";
import { invoiceInnerHtml } from "@/components/orders/printOrderDocuments";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [storeMeta, setStoreMeta] = useState(null);
  const [previewInv, setPreviewInv] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    getInvoiceStoreMeta().then(setStoreMeta).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setInvoices([]);
        return;
      }
      setInvoices(json.invoices || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  function printPdf(inv) {
    try {
      downloadInvoicePdf(inv, storeMeta || {});
      toast.success("Print dialog opened — choose “Save as PDF”.");
    } catch {
      toast.error("Could not open PDF.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} invoice{total === 1 ? "" : "s"} · separate from online orders
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="shrink-0 rounded-lg bg-[#1A7A4C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#15663f]"
        >
          + New invoice
        </Link>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search invoice #, customer, phone…"
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : !invoices.length ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-semibold">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {inv.customer?.name}
                      </div>
                      <div className="text-xs text-slate-400">{inv.customer?.phone}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums">
                      {formatAdminPrice(inv.pricing?.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          inv.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.paymentStatus === "partial"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setPreviewInv(inv)}
                          className="text-xs font-semibold text-slate-700 hover:underline dark:text-slate-200"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => printPdf(inv)}
                          className="text-xs font-semibold text-[#1A7A4C] hover:underline"
                        >
                          Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-600"
          >
            Prev
          </button>
          <span className="text-slate-500">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-600"
          >
            Next
          </button>
        </div>
      ) : null}

      {previewInv ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Preview · {previewInv.invoiceNumber}
                </h2>
                <p className="text-xs text-slate-400">Professional invoice layout</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printPdf(previewInv)}
                  className="rounded-lg bg-[#1A7A4C] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInv(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              title={`Preview ${previewInv.invoiceNumber}`}
              className="min-h-0 flex-1 w-full bg-white"
              style={{ height: "75vh" }}
              sandbox=""
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:ui-sans-serif,system-ui,sans-serif;margin:0;padding:20px;background:#fff}</style></head><body>${invoiceInnerHtml(previewInv, storeMeta || {})}</body></html>`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
