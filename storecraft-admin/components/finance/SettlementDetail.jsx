"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function ReturnChecklistButtons({ line, onSet, busy }) {
  const current = line.returnReceivedStatus || "pending";
  const opts = [
    { value: "pending", label: "Pending" },
    { value: "received", label: "Yes" },
    { value: "not_received", label: "No" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
      {opts.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={busy}
            onClick={() => void onSet(line.id, o.value)}
            className={[
              "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
              on
                ? o.value === "received"
                  ? "bg-emerald-600 text-white"
                  : o.value === "not_received"
                    ? "bg-rose-600 text-white"
                    : "bg-amber-500 text-white"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettlementDetail({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState("delivered");
  const [matchLineId, setMatchLineId] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [returnBusyId, setReturnBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/settlements/${batchId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not load settlement.");
        return;
      }
      setBatch(json.batch);
      setLines(json.lines || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const delivered = lines.filter((l) => l.status === "Delivered").length;
    const returns = lines.filter((l) => l.status === "Return").length;
    const unmatched = lines.filter((l) => l.matchStatus === "unmatched").length;
    const returnsPending = lines.filter(
      (l) => l.status === "Return" && (l.returnReceivedStatus || "pending") === "pending"
    ).length;
    return { delivered, returns, unmatched, returnsPending };
  }, [lines]);

  const visibleLines = useMemo(() => {
    if (tab === "delivered") return lines.filter((l) => l.status === "Delivered");
    if (tab === "returns") return lines.filter((l) => l.status === "Return");
    return lines.filter((l) => l.matchStatus === "unmatched");
  }, [lines, tab]);

  async function postBatch() {
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

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
        <p className="text-sm text-slate-500">
          Check each return manually: mark <strong>Yes</strong> when the parcel is back in your
          warehouse, or <strong>No</strong> if it never arrived.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80">
              <tr>
                <th className="px-3 py-2.5">Order #</th>
                <th className="px-3 py-2.5">Tracking</th>
                {tab !== "returns" ? <th className="px-3 py-2.5 text-right">COD</th> : null}
                <th className="px-3 py-2.5 text-right">Ship</th>
                <th className="px-3 py-2.5 text-right">GST</th>
                <th className="px-3 py-2.5 text-right">Tax</th>
                <th className="px-3 py-2.5 text-right">Net</th>
                {tab === "returns" ? (
                  <th className="px-3 py-2.5">Received back?</th>
                ) : (
                  <>
                    <th className="px-3 py-2.5 text-right">COGS</th>
                    <th className="px-3 py-2.5 text-right">Profit</th>
                    <th className="px-3 py-2.5">Match</th>
                  </>
                )}
                {tab === "unmatched" || (tab === "delivered" && batch.status === "draft") ? (
                  <th className="px-3 py-2.5">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visibleLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
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
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-[12px]">
                      {l.trackingNumber}
                    </td>
                    {tab !== "returns" ? (
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatMoney(l.codAmount)}
                      </td>
                    ) : null}
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
                    {tab === "returns" ? (
                      <td className="px-3 py-2.5">
                        <ReturnChecklistButtons
                          line={l}
                          busy={returnBusyId === l.id}
                          onSet={setReturnReceived}
                        />
                        {l.returnReceivedBy && l.returnReceivedStatus !== "pending" ? (
                          <p className="mt-1 text-[10px] text-slate-400">
                            by {l.returnReceivedBy}
                          </p>
                        ) : null}
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatMoney(l.productCogs)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatMoney(l.lineProfit)}
                        </td>
                        <td className="px-3 py-2.5 capitalize">{l.matchStatus}</td>
                      </>
                    )}
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
    </div>
  );
}
