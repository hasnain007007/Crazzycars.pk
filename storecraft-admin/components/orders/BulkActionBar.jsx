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
  const [liveProgress, setLiveProgress] = useState("");
  const [liveResults, setLiveResults] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [waQueue, setWaQueue] = useState(null);
  const [waIndex, setWaIndex] = useState(0);
  const [waSentCount, setWaSentCount] = useState(0);
  const [waBusy, setWaBusy] = useState(false);
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
    async (action, value, note = "Bulk update by admin") => {
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
            note,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error || "Bulk update failed");
          return;
        }
        const verb = value === "cancelled" ? "Cancelled" : "Updated";
        toast.success(`${verb} ${json.updated ?? 0} order(s).`);
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

  const cancelSelected = useCallback(async () => {
    if (!ids.length) return;
    const ok = window.confirm(
      `Cancel ${ids.length} selected order${ids.length === 1 ? "" : "s"}?\n\nThis sets their status to Cancelled.`
    );
    if (!ok) return;
    await bulkPut("updateStatus", "cancelled", "Bulk cancelled by admin");
  }, [ids.length, bulkPut]);

  const markProcessing = useCallback(() => {
    if (!ids.length) return;
    bulkPut("updateStatus", "processing", "Bulk marked processing by admin");
  }, [ids.length, bulkPut]);

  const addTagsSelected = useCallback(async () => {
    if (!ids.length) return;
    const raw = window.prompt("Add tag (comma-separated ok):");
    if (raw == null) return;
    const tags = String(raw)
      .split(",")
      .map((t) => t.trim().toLowerCase().slice(0, 40))
      .filter(Boolean);
    if (!tags.length) {
      toast.error("Enter at least one tag.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: ids,
          action: "addTags",
          tags,
          note: "Bulk tagged by admin",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not add tags");
        return;
      }
      toast.success(`Tagged ${json.updated ?? 0} order(s).`);
      onClear();
      onUpdated?.();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }, [ids, onClear, onUpdated]);

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
          const suggest =
            Array.isArray(json.suggestions) && json.suggestions.length
              ? ` (try ${json.suggestions.slice(0, 2).join(" / ")})`
              : "";
          failures.push(`${json.order?.orderNumber || id}: ${json.error || "Failed"}${suggest}`);
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

  const bookRunCourierBulk = useCallback(async () => {
    if (!ids.length) return;
    const ok = window.confirm(
      `Book ${ids.length} order(s) with Run Courier?\n\nUses the default Select API from Settings (e.g. Leopard2 / TCS). Orders that already have tracking will be skipped.`
    );
    if (!ok) return;

    setBusy(true);
    let okCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setBulkBookProgress(`Run Courier ${i + 1}/${ids.length}…`);
      try {
        const res = await fetch("/api/runcourier/create-shipment", {
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
    if (okCount) toast.success(`Run Courier booked ${okCount} order(s).`);
    if (failCount) {
      toast.error(`${failCount} failed. ${failures.slice(0, 2).join(" · ")}${failures.length > 2 ? "…" : ""}`);
    }
    onClear();
    onUpdated?.();
    setBusy(false);
  }, [ids, onClear, onUpdated]);

  const refreshLiveStatusBulk = useCallback(async () => {
    if (!ids.length) return;
    setBusy(true);
    setLiveResults(null);
    setLiveProgress(`Fetching live status for ${ids.length} order(s)…`);
    try {
      const body = JSON.stringify({ orderIds: ids, syncOrderStatus: true });
      const [postexRes, rcRes] = await Promise.all([
        fetch("/api/postex/track-bulk", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
        }),
        fetch("/api/runcourier/track-bulk", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      ]);
      const postexJson = await postexRes.json().catch(() => ({}));
      const rcJson = await rcRes.json().catch(() => ({}));

      const mergeCounts = (a = {}, b = {}) => ({
        okCount: (a.okCount || 0) + (b.okCount || 0),
        syncedCount: (a.syncedCount || 0) + (b.syncedCount || 0),
        skipCount: (a.skipCount || 0) + (b.skipCount || 0),
        failCount: (a.failCount || 0) + (b.failCount || 0),
        results: [...(a.results || []), ...(b.results || [])],
      });

      const postexOk = postexRes.ok && postexJson.success;
      const rcOk = rcRes.ok && rcJson.success;
      if (!postexOk && !rcOk) {
        toast.error(postexJson.error || rcJson.error || "Live status refresh failed");
        return;
      }

      const merged = mergeCounts(
        postexOk ? postexJson : {},
        rcOk ? rcJson : {}
      );
      setLiveResults({ success: true, ...merged, postex: postexJson, runcourier: rcJson });
      const parts = [];
      if (merged.okCount) parts.push(`${merged.okCount} updated`);
      if (merged.syncedCount) parts.push(`${merged.syncedCount} order status synced`);
      if (merged.skipCount) parts.push(`${merged.skipCount} skipped`);
      if (merged.failCount) parts.push(`${merged.failCount} failed`);
      toast.success(parts.join(" · ") || "Done");
      onUpdated?.();
    } catch {
      toast.error("Network error while fetching live status");
    } finally {
      setLiveProgress("");
      setBusy(false);
    }
  }, [ids, onUpdated]);

  const startBulkWhatsAppConfirm = useCallback(async () => {
    if (!ids.length) return;
    const ok = window.confirm(
      `Send WhatsApp confirmation to ${ids.length} selected order(s)?\n\n` +
        `WhatsApp will open one chat at a time with Yes/No confirm links.\n` +
        `Tap Send in WhatsApp, then click “Next” here for the next customer.\n\n` +
        `Already confirmed / already-sent / no-phone orders are skipped.`
    );
    if (!ok) return;

    setBusy(true);
    setWaBusy(true);
    try {
      const res = await fetch("/api/orders/bulk-wa-confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not prepare WhatsApp messages");
        return;
      }
      const ready = (json.results || []).filter((r) => r.success && r.waUrl);
      if (!ready.length) {
        toast.error(
          json.skipCount
            ? `Nothing to send — ${json.skipCount} skipped (no phone / already confirmed / already sent).`
            : "No messages ready."
        );
        return;
      }
      setWaQueue(ready);
      setWaIndex(0);
      setWaSentCount(0);
      toast.success(
        `Ready: ${ready.length} message(s)${json.skipCount ? ` · ${json.skipCount} skipped` : ""}`
      );
    } catch {
      toast.error("Network error preparing WhatsApp confirmations");
    } finally {
      setBusy(false);
      setWaBusy(false);
    }
  }, [ids]);

  const markWaNotified = useCallback(async (orderId) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNotified: true }),
      });
    } catch {
      /* non-fatal */
    }
  }, []);

  const openCurrentWaConfirm = useCallback(async () => {
    if (!waQueue?.length) return;
    const row = waQueue[waIndex];
    if (!row?.waUrl) return;
    setWaBusy(true);
    try {
      window.open(row.waUrl, "_blank", "noopener,noreferrer");
      await markWaNotified(row.orderId);
      setWaSentCount((n) => n + 1);
      toast.success(`Opened WhatsApp for ${row.orderNumber}`);
    } finally {
      setWaBusy(false);
    }
  }, [waQueue, waIndex, markWaNotified]);

  const nextWaConfirm = useCallback(() => {
    if (!waQueue?.length) return;
    if (waIndex >= waQueue.length - 1) {
      toast.success(`Done — opened ${waSentCount || waQueue.length} WhatsApp confirmation(s).`);
      setWaQueue(null);
      setWaIndex(0);
      onUpdated?.();
      return;
    }
    setWaIndex((i) => i + 1);
  }, [waQueue, waIndex, waSentCount, onUpdated]);

  const skipWaConfirm = useCallback(() => {
    nextWaConfirm();
  }, [nextWaConfirm]);

  const closeWaConfirm = useCallback(() => {
    setWaQueue(null);
    setWaIndex(0);
    onUpdated?.();
  }, [onUpdated]);

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

  const panelBtn = {
    background: "var(--bg-panel)",
    borderColor: "var(--border-hairline)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="sticky top-0 z-10 mb-3 rounded-lg border p-3 shadow-sm"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {selectedCount} order{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={markProcessing}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-none disabled:opacity-50"
            style={{ background: "var(--accent-line)" }}
            title="Mark selected as Processing"
          >
            Mark as Processing
          </button>
          <button
            type="button"
            disabled={busy || waBusy}
            onClick={() => void startBulkWhatsAppConfirm()}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-none disabled:opacity-50"
            style={{ background: busy || waBusy ? "var(--text-muted)" : "#25D366" }}
            title="Open WhatsApp confirmation (Yes/No links) for each selected order, one by one"
          >
            WhatsApp confirm selected
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={exportCsv}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
            style={panelBtn}
          >
            Export selected CSV
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={printPacking}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
            style={panelBtn}
          >
            Print packing slips
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={addTagsSelected}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
            style={{
              background: "color-mix(in srgb, var(--accent-money) 12%, var(--bg-panel))",
              borderColor: "var(--border-hairline)",
              color: "var(--accent-money)",
            }}
            title="Add a tag to selected orders"
          >
            Add tag
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={bookPostexBulk}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-none disabled:opacity-50"
            style={{ background: busy ? "var(--text-muted)" : "var(--accent-attention)" }}
          >
            {bulkBookProgress || "Book selected with Postex"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={bookRunCourierBulk}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-none disabled:opacity-50"
            style={{ background: busy ? "var(--text-muted)" : "#059669" }}
          >
            {bulkBookProgress?.startsWith("Run Courier")
              ? bulkBookProgress
              : "Book selected with Run Courier"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={refreshLiveStatusBulk}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold shadow-none disabled:opacity-50"
            style={{
              background: "color-mix(in srgb, var(--accent-line) 12%, transparent)",
              borderColor: "var(--border-hairline)",
              color: "var(--accent-line)",
            }}
            title="Fetch latest Postex live status for selected orders"
          >
            {liveProgress || "↻ Live status"}
          </button>
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPayOpen(false);
                setStatusOpen((v) => !v);
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
              style={panelBtn}
            >
              Update status ▾
            </button>
            {statusOpen ? (
              <div
                className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg"
                style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
              >
                {[
                  ["processing", "Mark as processing"],
                  ["shipped", "Mark as dispatched"],
                  ["delivered", "Mark as delivered"],
                  ["returned", "Mark as returned"],
                  ["cancelled", "Mark as cancelled"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm"
                    style={{ color: "var(--text-primary)" }}
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
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
              style={panelBtn}
            >
              Update payment ▾
            </button>
            {payOpen ? (
              <div
                className="absolute left-0 z-20 mt-1 min-w-[180px] rounded-lg border py-1 shadow-lg"
                style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
              >
                {[
                  ["paid", "Mark as paid"],
                  ["unpaid", "Mark as unpaid"],
                  ["refunded", "Mark as refunded"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm"
                    style={{ color: "var(--text-primary)" }}
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
            onClick={cancelSelected}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold shadow-none disabled:opacity-50"
            style={{
              background: "color-mix(in srgb, var(--accent-attention) 12%, transparent)",
              borderColor: "var(--border-hairline)",
              color: "var(--accent-attention)",
            }}
            title="Set selected orders to Cancelled"
          >
            Cancel selected
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={printInvoices}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-none disabled:opacity-50"
            style={panelBtn}
          >
            Print invoices
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
            title="Clear selection"
          >
            Clear <span aria-hidden>✕</span>
          </button>
        </div>
      </div>

      {waQueue?.length ? (
        <div
          className="mt-3 rounded-lg border p-4"
          style={{
            background: "color-mix(in srgb, #25D366 10%, var(--bg-panel))",
            borderColor: "var(--border-hairline)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#128C7E" }}>
                WhatsApp confirmation queue
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-primary)" }}>
                {waIndex + 1} of {waQueue.length}
                {waSentCount ? ` · ${waSentCount} opened` : ""}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold hover:underline"
              style={{ color: "#128C7E" }}
              onClick={closeWaConfirm}
            >
              Close
            </button>
          </div>

          {(() => {
            const row = waQueue[waIndex];
            if (!row) return null;
            return (
              <div
                className="mt-3 rounded-lg border p-3"
                style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {row.orderNumber} · {row.customerName}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {row.phone}
                </p>
                <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  Opens WhatsApp with Yes/No confirm links. Tap <strong>Send</strong> in WhatsApp,
                  then <strong>Next</strong> here.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={waBusy}
                    onClick={() => void openCurrentWaConfirm()}
                    className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: "#25D366" }}
                  >
                    {waBusy ? "Opening…" : "Open WhatsApp"}
                  </button>
                  <button
                    type="button"
                    disabled={waBusy}
                    onClick={nextWaConfirm}
                    className="rounded-lg border px-4 py-2 text-xs font-bold disabled:opacity-60"
                    style={{
                      background: "var(--bg-panel)",
                      borderColor: "var(--border-hairline)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {waIndex >= waQueue.length - 1 ? "Finish" : "Next →"}
                  </button>
                  <button
                    type="button"
                    disabled={waBusy}
                    onClick={skipWaConfirm}
                    className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {liveResults ? (
        <div
          className="mt-3 max-h-64 overflow-auto rounded-lg border p-3"
          style={{
            background: "color-mix(in srgb, var(--accent-line) 8%, var(--bg-panel))",
            borderColor: "var(--border-hairline)",
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--accent-line)" }}
            >
              Live status results
            </p>
            <button
              type="button"
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--accent-line)" }}
              onClick={() => setLiveResults(null)}
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-primary)" }}>
            {(liveResults.results || []).map((r) => (
              <li
                key={r.orderId}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5"
                style={{ background: "var(--bg-panel)" }}
              >
                <span className="font-bold">{r.orderNumber || r.orderId}</span>
                {r.success ? (
                  <>
                    <span style={{ color: "var(--accent-line)" }}>{r.status || "OK"}</span>
                    {r.currentLocation ? (
                      <span style={{ color: "var(--text-muted)" }}>· {r.currentLocation}</span>
                    ) : null}
                    {r.destination ? (
                      <span style={{ color: "var(--text-muted)" }}>→ {r.destination}</span>
                    ) : null}
                    {r.orderStatusSynced ? (
                      <span
                        className="rounded px-1.5 py-0.5 font-semibold"
                        style={{
                          background: "color-mix(in srgb, var(--accent-line) 14%, transparent)",
                          color: "var(--accent-line)",
                        }}
                      >
                        order →{" "}
                        {typeof r.orderStatusSynced === "object"
                          ? r.orderStatusSynced.to
                          : r.orderStatusSynced}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span
                    style={{
                      color: r.skipped ? "var(--accent-money)" : "var(--accent-attention)",
                    }}
                  >
                    {r.error || "Failed"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
