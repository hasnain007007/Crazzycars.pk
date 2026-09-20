"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

function formatMoney(n) {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const TABS = [
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns" },
  { key: "unmatched", label: "Unmatched" },
];

function ReturnConfirmBox({ line, onSet, busy }) {
  const current = line.returnReceivedStatus || "pending";
  const done = current === "received" || current === "not_received";

  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-sm transition-colors",
        current === "received"
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          : current === "not_received"
            ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/25",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">
            {line.orderId ? (
              <Link href={`/orders/${line.orderId}`} className="text-[#1d6fb8] hover:underline">
                {line.orderNumber || "Order"}
              </Link>
            ) : (
              line.orderNumber || "No order # on sheet"
            )}
          </p>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {line.trackingNumber}
          </p>
          {line.destinationCity ? (
            <p className="mt-1 text-xs text-slate-500">{line.destinationCity}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            Ship {formatMoney(line.shippingCharges)} · Net {formatMoney(line.netAmount)}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Parcel received back?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSet(line.id, "received")}
              className={[
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                current === "received"
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300",
              ].join(" ")}
            >
              Received
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSet(line.id, "not_received")}
              className={[
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                current === "not_received"
                  ? "bg-rose-600 text-white"
                  : "border border-rose-300 bg-white text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300",
              ].join(" ")}
            >
              Not received
            </button>
            {done ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSet(line.id, "pending")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white dark:border-slate-600"
              >
                Reset
              </button>
            ) : null}
          </div>
          {line.returnReceivedBy && done ? (
            <p className="text-[10px] text-slate-400">by {line.returnReceivedBy}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SettlementDetail({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [tab, setTab] = useState("delivered");
  const [matchLineId, setMatchLineId] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [returnBusyId, setReturnBusyId] = useState("");
  const autoRematchDone = useRef(false);
  const tabInit = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/settlements/${batchId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not load settlement.");
        return null;
      }
      setBatch(json.batch);
      setLines(json.lines || []);
      return json;
    } catch {
      toast.error("Network error.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void (async () => {
      const json = await load();
      if (!json?.lines || tabInit.current) return;
      tabInit.current = true;
      const pendingReturns = (json.lines || []).filter(
        (l) => l.status === "Return" && (l.returnReceivedStatus || "pending") === "pending"
      ).length;
      const returns = (json.lines || []).filter((l) => l.status === "Return").length;
      // Auto-open Returns checklist when parcels need confirmation
      if (pendingReturns > 0 || (typeof window !== "undefined" && /tab=returns/.test(window.location.search))) {
        setTab("returns");
      } else if (returns > 0 && (json.batch?.unmatchedCount || 0) === 0) {
        // keep delivered default unless only returns matter
      }

      // Auto re-match draft sheets that still have unmatched lines
      if (
        json.batch?.status === "draft" &&
        (json.batch?.unmatchedCount || 0) > 0 &&
        !autoRematchDone.current
      ) {
        autoRematchDone.current = true;
        try {
          const res = await fetch(`/api/finance/settlements/${batchId}/rematch`, {
            method: "POST",
            credentials: "include",
          });
          const rem = await res.json();
          if (res.ok && rem.success) {
            await load();
            if (rem.matchedCount > 0) {
              toast.success(`Auto-matched ${rem.matchedCount}/${rem.lineCount} lines`);
            }
          }
        } catch {
          /* ignore auto rematch errors */
        }
      }
    })();
  }, [load, batchId]);

  const counts = useMemo(() => {
    const delivered = lines.filter((l) => l.status === "Delivered").length;
    const returns = lines.filter((l) => l.status === "Return").length;
    const unmatched = lines.filter((l) => l.matchStatus === "unmatched").length;
    const returnsPending = lines.filter(
      (l) => l.status === "Return" && (l.returnReceivedStatus || "pending") === "pending"
    ).length;
    const returnsReceived = lines.filter(
      (l) => l.status === "Return" && l.returnReceivedStatus === "received"
    ).length;
    const returnsMissing = lines.filter(
      (l) => l.status === "Return" && l.returnReceivedStatus === "not_received"
    ).length;
    return { delivered, returns, unmatched, returnsPending, returnsReceived, returnsMissing };
  }, [lines]);

  const returnLines = useMemo(() => {
    const list = lines.filter((l) => l.status === "Return");
    const rank = (s) =>
      s === "pending" ? 0 : s === "not_received" ? 1 : 2;
    return [...list].sort(
      (a, b) =>
        rank(a.returnReceivedStatus || "pending") - rank(b.returnReceivedStatus || "pending")
    );
  }, [lines]);

  const visibleLines = useMemo(() => {
    if (tab === "delivered") return lines.filter((l) => l.status === "Delivered");
    if (tab === "returns") return returnLines;
    return lines.filter((l) => l.matchStatus === "unmatched");
  }, [lines, tab, returnLines]);

  async function postBatch() {
    if (counts.returnsPending > 0) {
      const ok = window.confirm(
        `${counts.returnsPending} return(s) still pending confirmation. Post anyway?`
      );
      if (!ok) {
        setTab("returns");
        return;
      }
    }
    if (!window.confirm("Post this settlement? Matched Delivered orders will be marked Paid.")) {
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`/api/finance/settlements/${batchId}/post`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Post failed.");
        return;
      }
      toast.success(`Posted — ${json.markedPaid} marked paid.`);
      await load();
    } catch {
      toast.error("Network error.");
    } finally {
      setPosting(false);
    }
  }

  async function rematch() {
    setRematching(true);
    try {
      const res = await fetch(`/api/finance/settlements/${batchId}/rematch`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Rematch failed.");
        return;
      }
      toast.success(
        `Matched ${json.matchedCount}/${json.lineCount}` +
          (Number.isFinite(Number(json.profitTotal))
            ? ` · ${(Number(json.profitTotal) || 0) < 0 ? "Loss" : "Profit"} ${formatMoney(json.profitTotal)}`
            : "")
      );
      await load();
    } catch {
      toast.error("Network error.");
    } finally {
      setRematching(false);
    }
  }

  async function patchLine(lineId, body) {
    const res = await fetch(`/api/finance/settlements/${batchId}/lines/${lineId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Update failed.");
      return false;
    }
    return true;
  }

  async function ignoreLine(lineId) {
    if (!(await patchLine(lineId, { matchStatus: "ignored" }))) return;
    toast.success("Line ignored.");
    await load();
  }

  async function setReturnReceived(lineId, status) {
    setReturnBusyId(lineId);
    try {
      if (!(await patchLine(lineId, { returnReceivedStatus: status }))) return;
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? {
                ...l,
                returnReceivedStatus: status,
                returnReceivedAt: status === "pending" ? null : new Date().toISOString(),
              }
            : l
        )
      );
      if (status === "received") toast.success("Marked received");
      else if (status === "not_received") toast.success("Marked not received");
    } finally {
      setReturnBusyId("");
    }
  }

  async function searchOrders() {
    if (searchQ.trim().length < 3) {
      toast.error("Type at least 3 characters.");
      return;
    }
    const res = await fetch(
      `/api/finance/orders/search?q=${encodeURIComponent(searchQ.trim())}`,
      { credentials: "include" }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Search failed.");
      return;
    }
    setSearchHits(json.orders || []);
  }

  async function linkOrder(orderId) {
    if (!matchLineId) return;
    if (!(await patchLine(matchLineId, { orderId }))) return;
    toast.success("Order linked.");
    setMatchLineId(null);
    setSearchHits([]);
    setSearchQ("");
    await load();
  }

  if (loading && !batch) {
    return <p className="text-sm text-slate-500">Loading settlement…</p>;
  }
  if (!batch) {
    return (
      <p className="text-sm text-slate-500">
        Settlement not found. <Link href="/finance">Back</Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/finance" className="text-sm text-[#1d6fb8] hover:underline">
            ← Finance
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            {batch.cprNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {batch.courier} · {batch.status} · {batch.filename}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {batch.status === "draft" ? (
            <button
              type="button"
              disabled={rematching}
              onClick={() => void rematch()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {rematching ? "Matching…" : "Re-match orders"}
            </button>
          ) : null}
          {batch.status === "draft" ? (
            <button
              type="button"
              disabled={posting}
              onClick={() => void postBatch()}
              className="rounded-lg bg-[#1A7A4C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15633d] disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post settlement"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-500">COD total</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(batch.codTotal)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-500">Delivery charges</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(batch.shippingCharges)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-500">GST + other tax</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatMoney((Number(batch.gst) || 0) + (Number(batch.deduction4pct) || 0))}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-500">Total received</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#1A7A4C]">
            {formatMoney(batch.netTotal)}
          </p>
        </div>
        <div
          className={[
            "rounded-xl border p-4",
            (Number(batch.profitTotal) || 0) < -0.005
              ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
              : (Number(batch.profitTotal) || 0) > 0.005
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
          ].join(" ")}
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            {(Number(batch.profitTotal) || 0) < -0.005
              ? "Loss"
              : (Number(batch.profitTotal) || 0) > 0.005
                ? "Profit"
                : "P/L"}
          </p>
          <p
            className={[
              "mt-1 text-lg font-bold tabular-nums",
              (Number(batch.profitTotal) || 0) < -0.005
                ? "text-rose-600"
                : (Number(batch.profitTotal) || 0) > 0.005
                  ? "text-[#1A7A4C]"
                  : "text-slate-900 dark:text-white",
            ].join(" ")}
          >
            {formatMoney(batch.profitTotal)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Net − product cost ({formatMoney(batch.productCogsTotal)})
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Expense &amp; profit breakdown
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">Shipping</span>
            <span className="font-semibold tabular-nums">{formatMoney(batch.shippingCharges)}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">GST</span>
            <span className="font-semibold tabular-nums">{formatMoney(batch.gst)}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">4% tax</span>
            <span className="font-semibold tabular-nums">{formatMoney(batch.deduction4pct)}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">Product cost (matched)</span>
            <span className="font-semibold tabular-nums">{formatMoney(batch.productCogsTotal)}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">Return fees</span>
            <span className="font-semibold tabular-nums text-rose-600">
              {formatMoney(batch.returnFeesTotal)}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
            <span className="text-slate-500">
              {(Number(batch.profitTotal) || 0) < 0 ? "Net loss" : "Net profit"}
            </span>
            <span
              className={[
                "font-bold tabular-nums",
                (Number(batch.profitTotal) || 0) < 0 ? "text-rose-600" : "text-[#1A7A4C]",
              ].join(" ")}
            >
              {formatMoney(batch.profitTotal)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Remittance net already includes return fees. Profit = remittance net − matched product
          cost. Post marks matched Delivered orders Paid + Delivered.
        </p>
      </div>

      {counts.returns > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div>
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              {counts.returnsPending > 0
                ? `${counts.returnsPending} return parcel(s) need confirmation`
                : `All ${counts.returns} returns checked`}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              Received {counts.returnsReceived} · Not received {counts.returnsMissing} · Pending{" "}
              {counts.returnsPending}
            </p>
          </div>
          {counts.returnsPending > 0 ? (
            <button
              type="button"
              onClick={() => setTab("returns")}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Confirm returns
            </button>
          ) : null}
        </div>
      ) : null}

      {batch.status === "draft" && matchLineId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Link order to tracking{" "}
            <span className="font-mono">
              {lines.find((l) => l.id === matchLineId)?.trackingNumber}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Order #, phone, tracking…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => void searchOrders()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setMatchLineId(null);
                setSearchHits([]);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {searchHits.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {searchHits.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{o.orderNumber}</strong> · {o.customerName} · {o.phone} · CN{" "}
                    {o.trackingNumber || "—"} · {formatMoney(o.total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void linkOrder(o.id)}
                    className="rounded bg-[#1d6fb8] px-2 py-1 text-xs font-semibold text-white"
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
        role="tablist"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === "delivered"
              ? counts.delivered
              : t.key === "returns"
                ? counts.returns
                : counts.unmatched;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {t.label}
              <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
              {t.key === "returns" && counts.returnsPending > 0 ? (
                <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                  {counts.returnsPending} pending
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "returns" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Returns are pulled automatically from the courier sheet. Confirm each parcel is back in
            your warehouse.
          </p>
          {returnLines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              No returns on this sheet.
            </p>
          ) : (
            returnLines.map((l) => (
              <ReturnConfirmBox
                key={l.id}
                line={l}
                busy={returnBusyId === l.id}
                onSet={setReturnReceived}
              />
            ))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2.5">Order #</th>
                  <th className="px-3 py-2.5">Tracking</th>
                  <th className="px-3 py-2.5 text-right">COD</th>
                  <th className="px-3 py-2.5 text-right">Ship</th>
                  <th className="px-3 py-2.5 text-right">GST</th>
                  <th className="px-3 py-2.5 text-right">Tax</th>
                  <th className="px-3 py-2.5 text-right">Net</th>
                  <th className="px-3 py-2.5 text-right">COGS</th>
                  <th className="px-3 py-2.5 text-right">Profit</th>
                  <th className="px-3 py-2.5">Match</th>
                  {tab === "unmatched" || (tab === "delivered" && batch.status === "draft") ? (
                    <th className="px-3 py-2.5">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visibleLines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-sm text-slate-500">
                      No lines in this tab.
                    </td>
                  </tr>
                ) : (
                  visibleLines.map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-3 py-2.5">
                        {l.orderId ? (
                          <Link
                            href={`/orders/${l.orderId}`}
                            className="font-semibold text-[#1d6fb8] hover:underline"
                          >
                            {l.orderNumber || "Order"}
                          </Link>
                        ) : l.orderNumber ? (
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {l.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-[12px]">
                        {l.trackingNumber}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.codAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.shippingCharges)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(l.gst)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.deduction4pct)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {formatMoney(l.netAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.productCogs)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.lineProfit)}
                      </td>
                      <td className="px-3 py-2.5 capitalize">{l.matchStatus}</td>
                      {(tab === "unmatched" ||
                        (tab === "delivered" &&
                          batch.status === "draft" &&
                          l.matchStatus === "unmatched")) &&
                      batch.status === "draft" ? (
                        <td className="px-3 py-2.5">
                          {l.matchStatus === "unmatched" ? (
                            <span className="inline-flex gap-2">
                              <button
                                type="button"
                                className="text-[11px] font-semibold text-[#1d6fb8]"
                                onClick={() => setMatchLineId(l.id)}
                              >
                                Link
                              </button>
                              <button
                                type="button"
                                className="text-[11px] font-semibold text-slate-500"
                                onClick={() => void ignoreLine(l.id)}
                              >
                                Ignore
                              </button>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
