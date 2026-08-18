/**
 * Invoices list — preview loads full invoice; edit link to change items/rates.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";
import { downloadInvoicePdf, printInvoice } from "@/lib/downloadInvoicePdf";
import { InvoicePreviewFrame } from "@/components/invoices/InvoicePreviewFrame";

export function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdFilter = searchParams.get("customerId") || "";
  const customerNameHint = searchParams.get("customerName") || "";

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [storeMeta, setStoreMeta] = useState(null);
  const [previewInv, setPreviewInv] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [creatingOrderId, setCreatingOrderId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, customerIdFilter]);

  useEffect(() => {
    getInvoiceStoreMeta().then(setStoreMeta).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debounced) params.set("search", debounced);
      if (customerIdFilter) params.set("customerId", customerIdFilter);
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
  }, [page, debounced, customerIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function openPreview(inv) {
    setPreviewLoading(true);
    setPreviewInv(null);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success || !json.invoice) {
        toast.error(json.error || "Could not load invoice for preview.");
        return;
      }
      setPreviewInv(json.invoice);
    } catch {
      toast.error("Could not load invoice for preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function loadFullInvoice(inv) {
    const res = await fetch(`/api/invoices/${inv.id}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success || !json.invoice) {
      throw new Error(json.error || "Could not load invoice.");
    }
    return json.invoice;
  }

  function handlePrint(inv) {
    try {
      printInvoice(inv, storeMeta || {});
      toast.success("Print dialog opened.");
    } catch {
      toast.error("Could not print invoice.");
    }
  }

  async function handleDownloadPdf(inv) {
    const toastId = toast.loading("Preparing PDF…");
    try {
      await downloadInvoicePdf(inv, storeMeta || {});
      toast.success("PDF downloaded.", { id: toastId });
    } catch {
      toast.error("Could not download PDF.", { id: toastId });
    }
  }

  async function handleDelete(inv) {
    if (
      !confirm(
        `Delete invoice ${inv.invoiceNumber}? This cannot be undone. Stock will be restored for catalog items.`
      )
    ) {
      return;
    }
    setDeletingId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success(json.message || "Invoice deleted.");
      if (previewInv?.id === inv.id) setPreviewInv(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not delete invoice.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddToOrders(inv) {
    if (inv.linkedOrderId) {
      router.push(`/orders/${inv.linkedOrderId}`);
      return;
    }
    if (
      !confirm(
        `Add invoice ${inv.invoiceNumber} to Orders?\n\nCreates a linked order for packing / Postex. Stock was already deducted when the invoice was saved.`
      )
    ) {
      return;
    }
    setCreatingOrderId(inv.id);
    const toastId = toast.loading("Creating order…");
    try {
      const res = await fetch(`/api/invoices/${inv.id}/create-order`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not create order.");
      const orderId = json.order?.id;
      const orderNumber = json.order?.orderNumber || "";
      toast.success(
        json.alreadyLinked
          ? `Already linked to ${orderNumber || "order"}.`
          : `Order ${orderNumber} created.`,
        { id: toastId }
      );
      setInvoices((prev) =>
        prev.map((row) =>
          row.id === inv.id
            ? {
                ...row,
                linkedOrderId: orderId || row.linkedOrderId,
                linkedOrderNumber: orderNumber || row.linkedOrderNumber,
              }
            : row
        )
      );
      if (previewInv?.id === inv.id) {
        setPreviewInv((p) =>
          p
            ? {
                ...p,
                linkedOrderId: orderId || p.linkedOrderId,
                linkedOrderNumber: orderNumber || p.linkedOrderNumber,
              }
            : p
        );
      }
      if (orderId) router.push(`/orders/${orderId}`);
    } catch (err) {
      toast.error(err.message || "Could not create order.", { id: toastId });
    } finally {
      setCreatingOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} invoice{total === 1 ? "" : "s"}
            {customerIdFilter
              ? ` for ${customerNameHint || "this customer"}`
              : " · separate from online orders"}
          </p>
          {customerIdFilter ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/customers/${customerIdFilter}`}
                className="font-semibold text-[#1A7A4C] hover:underline"
              >
                Open customer profile
              </Link>
              <Link href="/invoices" className="font-semibold text-slate-500 hover:underline">
                Clear customer filter
              </Link>
            </div>
          ) : null}
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
                        {inv.customerId ? (
                          <Link
                            href={`/customers/${inv.customerId}`}
                            className="hover:text-[#1A7A4C] hover:underline"
                          >
                            {inv.customer?.name}
                          </Link>
                        ) : (
                          inv.customer?.name
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{inv.customer?.phone}</div>
                      {inv.customerId ? (
                        <Link
                          href={`/invoices?customerId=${inv.customerId}&customerName=${encodeURIComponent(inv.customer?.name || "")}`}
                          className="text-[10px] font-semibold text-[#1A7A4C] hover:underline"
                        >
                          All invoices for customer
                        </Link>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums">
                      {formatAdminPrice(inv.pricing?.total)}
                      {(inv.paymentStatus === "partial" || inv.paymentStatus === "unpaid") &&
                      Number(inv.remainingBalance) > 0 ? (
                        <div className="mt-0.5 text-[10px] font-medium text-amber-600">
                          Due {formatAdminPrice(inv.remainingBalance)}
                        </div>
                      ) : null}
                      {inv.paymentStatus === "partial" && Number(inv.amountPaid) > 0 ? (
                        <div className="text-[10px] font-medium text-emerald-600">
                          Paid {formatAdminPrice(inv.amountPaid)}
                        </div>
                      ) : null}
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
                          onClick={() => openPreview(inv)}
                          className="text-xs font-semibold text-slate-700 hover:underline dark:text-slate-200"
                        >
                          Preview
                        </button>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-xs font-semibold text-[#1d6fb8] hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const full = await loadFullInvoice(inv);
                              handlePrint(full);
                            } catch (err) {
                              toast.error(err.message || "Could not print.");
                            }
                          }}
                          className="text-xs font-semibold text-slate-700 hover:underline dark:text-slate-200"
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const full = await loadFullInvoice(inv);
                              await handleDownloadPdf(full);
                            } catch (err) {
                              toast.error(err.message || "Could not download PDF.");
                            }
                          }}
                          className="text-xs font-semibold text-[#1A7A4C] hover:underline"
                        >
                          Download PDF
                        </button>
                        {inv.linkedOrderId ? (
                          <Link
                            href={`/orders/${inv.linkedOrderId}`}
                            className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            View order{inv.linkedOrderNumber ? ` (${inv.linkedOrderNumber})` : ""}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled={creatingOrderId === inv.id}
                            onClick={() => void handleAddToOrders(inv)}
                            className="text-xs font-semibold text-[#1d6fb8] hover:underline disabled:opacity-50"
                          >
                            {creatingOrderId === inv.id ? "Adding…" : "Add to orders"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === inv.id}
                          onClick={() => void handleDelete(inv)}
                          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === inv.id ? "Deleting…" : "Delete"}
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

      {previewLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <p className="rounded-xl bg-white px-6 py-4 text-sm font-semibold shadow-lg">Loading preview…</p>
        </div>
      ) : null}

      {previewInv ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Preview · {previewInv.invoiceNumber}
                </h2>
                <p className="text-xs text-slate-400">Full invoice with logo, items &amp; totals</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/invoices/${previewInv.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handlePrint(previewInv)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewInv)}
                  className="rounded-lg bg-[#1A7A4C] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Download PDF
                </button>
                {previewInv.linkedOrderId ? (
                  <Link
                    href={`/orders/${previewInv.linkedOrderId}`}
                    className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  >
                    View order
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={creatingOrderId === previewInv.id}
                    onClick={() => void handleAddToOrders(previewInv)}
                    className="rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {creatingOrderId === previewInv.id ? "Adding…" : "Add to orders"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={deletingId === previewInv.id}
                  onClick={() => void handleDelete(previewInv)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900"
                >
                  {deletingId === previewInv.id ? "Deleting…" : "Delete"}
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
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 dark:bg-slate-950">
              <InvoicePreviewFrame
                invoice={previewInv}
                storeMeta={storeMeta}
                className="min-h-[80vh] w-full rounded-lg bg-white shadow-sm"
                style={{ height: "80vh" }}
                title={`Preview ${previewInv.invoiceNumber}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
