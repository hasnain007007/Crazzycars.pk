"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { InvoicePreviewFrame } from "@/components/invoices/InvoicePreviewFrame";
import {
  buildWaLink,
  getCustomerOrderPhone,
  openWhatsApp,
} from "@/components/orders/OrderWhatsAppButton";
import { buildOrderInvoiceWhatsAppMessage, resolveOrderInvoiceEmail } from "@/lib/orderInvoice";
import {
  downloadInvoicePdf,
  openInvoiceDocumentWindow,
  printInvoice,
} from "@/lib/downloadInvoicePdf";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";

export function SendInvoicePanel({ order, orderId, open, onClose, onSent }) {
  const [storeMeta, setStoreMeta] = useState(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(resolveOrderInvoiceEmail(order));
    setNote("");
    getInvoiceStoreMeta().then(setStoreMeta).catch(() => setStoreMeta(null));
  }, [open, order]);

  const lastInvoiceEmail = useMemo(() => {
    const rows = (order?.emailHistory || []).filter((e) => e.type === "invoice");
    if (!rows.length) return null;
    return rows[rows.length - 1];
  }, [order?.emailHistory]);

  if (!open || !order) return null;

  async function handleSendEmail() {
    const to = String(email || "").trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error("Enter a valid customer email.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/send-invoice`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: to, note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not send invoice.");
        return;
      }
      toast.success(`Invoice emailed to ${to}`);
      onSent?.(json.order);
      onClose?.();
    } catch {
      toast.error("Network error.");
    } finally {
      setSending(false);
    }
  }

  function handleWhatsApp() {
    const phone = getCustomerOrderPhone(order);
    if (!phone) {
      toast.error("No customer phone number on this order.");
      return;
    }
    const msg = buildOrderInvoiceWhatsAppMessage(order, storeMeta || {});
    if (!buildWaLink(phone, msg)) {
      toast.error("Invalid phone number.");
      return;
    }
    openWhatsApp(phone, msg);
    toast.success("WhatsApp opened with invoice summary.");
  }

  function handlePrint() {
    try {
      printInvoice(order, storeMeta || {});
      toast.success("Print dialog opened.");
    } catch {
      toast.error("Could not print invoice.");
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    const toastId = toast.loading("Preparing PDF…");
    try {
      await downloadInvoicePdf(order, storeMeta || {});
      toast.success("PDF downloaded.", { id: toastId });
    } catch (err) {
      toast(
        (t) => (
          <span>
            PDF auto-download failed — invoice opened in a new tab. Use{" "}
            <strong>Print → Save as PDF</strong> there.
          </span>
        ),
        { id: toastId, duration: 6000, icon: "ℹ️" }
      );
    } finally {
      setDownloading(false);
    }
  }

  function handleViewInTab() {
    try {
      openInvoiceDocumentWindow(order, storeMeta || {});
      toast.success("Invoice opened in new tab.");
    } catch (err) {
      toast.error(err?.message || "Could not open invoice. Allow popups and retry.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-invoice-title"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 id="send-invoice-title" className="text-base font-bold text-slate-900 dark:text-white">
              Invoice — {order.orderNumber}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Preview, print, download, or send to the customer
            </p>
            {lastInvoiceEmail ? (
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                Last sent {new Date(lastInvoiceEmail.sentAt).toLocaleString()} → {lastInvoiceEmail.to}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-h-0 border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-700">
            <InvoicePreviewFrame
              invoice={order}
              storeMeta={storeMeta || {}}
              className="h-[min(52vh,480px)] w-full border-0"
              style={{ minHeight: 280 }}
              title={`Invoice preview ${order.orderNumber}`}
            />
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Customer email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              {!email ? (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                  No real email on file — enter one manually or use WhatsApp below.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Personal note (optional, included in email)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. Your order is ready for dispatch."
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <button
              type="button"
              disabled={sending || !email}
              onClick={handleSendEmail}
              className="w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white hover:bg-[#185f9e] disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send invoice to customer"}
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white"
              style={{ background: "#25D366" }}
            >
              WhatsApp invoice summary
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleViewInTab}
                className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100"
              >
                Open invoice in new tab
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100"
              >
                Print
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadPdf}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100"
              >
                {downloading ? "…" : "Download PDF"}
              </button>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              If Download PDF fails, use <strong>Open invoice in new tab</strong> then Print → Save as PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
