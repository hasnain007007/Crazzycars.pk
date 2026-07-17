/**
 * Sticky bulk actions for orders list (status, payment, print, export).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  invoiceInnerHtml,
  packingSlipInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
  wrapPages,
} from "./printOrderDocuments";

function printOrderDocument(title, bodyInner) {
  try {
    printHtmlWithIframe(printDocumentShell(title, bodyInner));
  } catch {
    toast.error("Print failed.");
  }
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function orderToCsvRow(o) {
  const itemSummary = Array.isArray(o.items)
    ? o.items.map((i) => `${i.quantity}× ${i.name}`).join("; ")
    : "";
  const addr = o.shippingAddress || {};
  const ship = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(", ");
  return [
    csvEscape(o.orderNumber),
    csvEscape(o.createdAt ? new Date(o.createdAt).toISOString() : ""),
    csvEscape(o.customer?.name || ""),
    csvEscape(itemSummary),
    csvEscape(o.pricing?.total ?? o.total ?? ""),
    csvEscape(o.orderStatus),
    csvEscape(o.paymentStatus),
    csvEscape(ship),
  ].join(",");
}

export function BulkActionBar({
  selectedIds,
  selectedCount,
  onClear,
  onUpdated,
  getStoreSettings,
}) {
  const [busy, setBusy] = useState(false);
  const [bulkBookProgress, setBulkBookProgress] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const statusRef = useRef(null);
  const payRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!statusRef.current?.contains(e.target)) setStatusOpen(false);
      if (!payRef.current?.contains(e.target)) setPayOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const ids = selectedIds;

  const bulkPut = useCallback(
    async (action, value) => {
      if (!ids.length) return;
      setBusy(true);
      try {
        const res = await fetch("/api/orders/bulk", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderIds: ids,
            action,
            value,
            note: "Bulk update by admin",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Bulk update failed");
          return;
        }
        toast.success(`Updated ${json.updated ?? 0} order(s).`);
        onClear();
        onUpdated?.();
      } catch {
        toast.error("Network error");
      } finally {
        setBusy(false);
        setStatusOpen(false);
        setPayOpen(false);
      }
    },
    [ids, onClear, onUpdated]
  );

  const fetchOrders = useCallback(async () => {
    const list = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) return null;
        return json.order;
      })
    );
    return list.filter(Boolean);
  }, [ids]);

  const printPacking = useCallback(async () => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const orders = await fetchOrders();
      if (!orders.length) {
        toast.error("Could not load orders.");
        return;
      }
      const settings = (await getStoreSettings?.()) || {};
      const inner = wrapPages(orders.map((o) => packingSlipInnerHtml(o, settings)));
      printOrderDocument("Packing slips", inner);
    } catch {
      toast.error("Could not prepare packing slips.");
    } finally {
      setBusy(false);
    }
  }, [fetchOrders, getStoreSettings, ids.length]);

  const printInvoices = useCallback(async () => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const orders = await fetchOrders();
      if (!orders.length) {
        toast.error("Could not load orders.");
        return;
      }
      const settings = (await getStoreSettings?.()) || {};
      const inner = wrapPages(orders.map((o) => invoiceInnerHtml(o, settings)));
      printOrderDocument("Invoices", inner);
    } catch {
      toast.error("Could not prepare invoices.");
    } finally {
      setBusy(false);
    }
  }, [fetchOrders, getStoreSettings, ids.length]);

  const bookPostexBulk = useCallback(async () => {
    if (!ids.length) return;
    const ok = window.confirm(
      `Book ${ids.length} order(s) with Postex?\n\nEach booking charges your Postex account. Orders that already have tracking will be skipped.`
    );
    if (!ok) return;

    setBusy(true);
    let okCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setBulkBookProgress(`Booking ${i + 1} of ${ids.length}…`);
      try {
        const res = await fetch("/api/postex/create-shipment", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          okCount += 1;
        } else {
          failCount += 1;
          failures.push(`${json.order?.orderNumber || id}: ${json.error || "Failed"}`);
        }
      } catch {
        failCount += 1;
        failures.push(`${id}: Network error`);
      }
    }

    setBulkBookProgress("");
    if (okCount) toast.success(`Postex booked ${okCount} order(s).`);
    if (failCount) {
      toast.error(`${failCount} failed. ${failures.slice(0, 2).join(" · ")}${failures.length > 2 ? "…" : ""}`);
    }
    onClear();
    onUpdated?.();
    setBusy(false);
  }, [ids, onClear, onUpdated]);

  const exportCsv = useCallback(async () => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const orders = await fetchOrders();
      if (!orders.length) {
        toast.error("Could not load orders.");
        return;
      }
      const header = ["Order#", "Date", "Customer", "Items", "Total", "Status", "Payment", "Shipping Address"];
      const lines = [header.join(",")];
      for (const o of orders) lines.push(orderToCsvRow(o));
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-selected-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded.");
    } catch {
      toast.error("Export failed.");
    } finally {
      setBusy(false);
    }
  }, [fetchOrders, ids.length]);

  if (selectedCount < 1) return null;

  return (
    <div className="sticky top-0 z-10 mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {selectedCount} order{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={bookPostexBulk}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            style={{ background: busy ? "#9CA3AF" : "#C41E1E" }}
          >
            {bulkBookProgress || "Book selected with Postex"}
          </button>
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPayOpen(false);
                setStatusOpen((v) => !v);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Update status ▾
            </button>
            {statusOpen ? (
              <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900">
                {[
                  ["processing", "Mark as processing"],
                  ["shipped", "Mark as shipped"],
                  ["delivered", "Mark as delivered"],
                  ["cancelled", "Mark as cancelled"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => bulkPut("updateStatus", val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={payRef}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStatusOpen(false);
                setPayOpen((v) => !v);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Update payment ▾
            </button>
            {payOpen ? (
              <div className="absolute left-0 z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900">
                {[
                  ["paid", "Mark as paid"],
                  ["unpaid", "Mark as unpaid"],
                  ["refunded", "Mark as refunded"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => bulkPut("updatePayment", val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={printPacking}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Print packing slips
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={printInvoices}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Print invoices
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={exportCsv}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Export selected CSV
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Clear selection"
          >
            Clear <span aria-hidden>✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
