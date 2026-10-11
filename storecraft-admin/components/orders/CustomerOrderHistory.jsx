/**
 * Sidebar: other orders from the same customer (phone / email / account).
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAdminPrice } from "@/lib/currency";
import { formatPhoneDisplay } from "@/lib/guestCustomerDisplay";

function formatWhen(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "delivered") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (s === "shipped" || s === "in_transit" || s === "out_for_delivery") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
  }
  if (s === "cancelled" || s === "canceled" || s === "returned" || s === "rto") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  }
  if (s === "pending" || s === "confirmed" || s === "processing") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function deliveredLabel(row) {
  if (row.isDelivered) {
    return row.deliveredAt ? `Delivered ${formatWhen(row.deliveredAt)}` : "Delivered";
  }
  if (row.trackingLastStatus) return String(row.trackingLastStatus);
  return "Not delivered";
}

export function CustomerOrderHistory({ orderId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/customer-history`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.error || "Could not load customer history");
          setData(null);
          return;
        }
        setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load customer history");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const summary = data?.summary;
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const phoneDisplay = formatPhoneDisplay(data?.identity?.phone) || data?.identity?.phone || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customer history</h2>
        {summary?.isRepeat ? (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
            Repeat
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            First order
          </span>
        )}
      </div>

      {phoneDisplay ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Matched by phone {phoneDisplay}</p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Loading past orders…</p>
      ) : error ? (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/80">
              <dt className="text-slate-500">Total orders</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{summary?.totalOrders ?? 0}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/80">
              <dt className="text-slate-500">Prior orders</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{summary?.priorOrders ?? 0}</dd>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2 py-1.5 dark:bg-emerald-950/40">
              <dt className="text-emerald-700/80 dark:text-emerald-300/80">Delivered</dt>
              <dd className="font-semibold text-emerald-900 dark:text-emerald-100">
                {summary?.delivered ?? 0}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/80">
              <dt className="text-slate-500">Prior spend</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {formatAdminPrice(summary?.spentPrior || 0)}
              </dd>
            </div>
          </dl>

          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-0.5">
            {orders.map((row) => (
              <li
                key={row.id}
                className={`rounded-lg border px-2.5 py-2 text-xs ${
                  row.isCurrent
                    ? "border-indigo-300 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {row.isCurrent ? (
                      <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                        {row.orderNumber || row.id}
                        <span className="ml-1 text-[10px] font-medium uppercase text-indigo-600">
                          this order
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={`/orders/${row.id}`}
                        className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
                      >
                        {row.orderNumber || row.id}
                      </Link>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatWhen(row.createdAt)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(
                      row.orderStatus
                    )}`}
                  >
                    {String(row.orderStatus || "—").replace(/_/g, " ")}
                  </span>
                </div>

                <p className="mt-1 truncate text-[11px] text-slate-600 dark:text-slate-300" title={row.itemSummary}>
                  {row.itemSummary}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatAdminPrice(row.total)}
                  </span>
                  <span className="capitalize">{row.paymentMethod || "—"}</span>
                  <span className="capitalize">{row.paymentStatus || "—"}</span>
                  {row.city ? <span>{row.city}</span> : null}
                </div>

                <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <p className="text-[11px]">
                    <span className="text-slate-500">Tracking: </span>
                    {row.trackingNumber ? (
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {row.trackingNumber}
                        {row.courier ? (
                          <span className="ml-1 font-sans font-normal text-slate-500">
                            ({row.courier})
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not booked</span>
                    )}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      row.isDelivered
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {deliveredLabel(row)}
                  </p>
                  {Array.isArray(row.previousTrackings) && row.previousTrackings.length ? (
                    <p className="text-[10px] text-slate-400">
                      Prior AWB:{" "}
                      {row.previousTrackings
                        .map((t) => t.trackingNumber)
                        .filter(Boolean)
                        .slice(0, 3)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default CustomerOrderHistory;
