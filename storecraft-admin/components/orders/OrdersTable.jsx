/**
 * Orders list table with badges, row navigation, pagination, and bulk selection.
 */
"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/orderUi";
import { BulkActionBar } from "./BulkActionBar";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function OrdersTable({ orders, page, totalPages, onPageChange, loading, onOrdersChanged }) {
  const router = useRouter();
  const [selected, setSelected] = useState({});

  const pageIds = useMemo(() => (orders || []).map((o) => o.id), [orders]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected[id]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;
  const someOnPageSelected = pageIds.some((id) => selected[id]);
  const headerIndeterminate = someOnPageSelected && !allOnPageSelected;
  const headerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate, allOnPageSelected, loading]);

  const toggleRow = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const toggleAllPage = useCallback(
    (e) => {
      e?.stopPropagation?.();
      setSelected((p) => {
        const next = { ...p };
        if (allOnPageSelected) {
          for (const id of pageIds) delete next[id];
        } else {
          for (const id of pageIds) next[id] = true;
        }
        return next;
      });
    },
    [allOnPageSelected, pageIds]
  );

  const clearSelection = useCallback(() => setSelected({}), []);

  const getStoreSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const settings = json.settings || json.data || {};
        const g = settings.general || {};
        const inv = settings.invoice || {};
        const appearance = settings.appearance || {};
        return {
          storeName: g.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Store",
          logoUrl: g.logoUrl || g.logo?.url || "",
          phone: g.phone || "",
          email: g.email || "",
          website: g.website || "",
          address: g.address || "",
          footerText: g.footerText || "",
          currency: g.currency || g.defaultCurrency || "PKR",
          primaryColor: appearance.primaryColor || "#1A7A4C",
          ntn: inv.ntn || "",
          strn: inv.strn || "",
          bankName: inv.bankName || "",
          bankAccountTitle: inv.bankAccountTitle || "",
          bankAccountNumber: inv.bankAccountNumber || "",
          bankIban: inv.bankIban || "",
          terms: inv.terms || "",
          footerNote: inv.footerNote || "",
        };
      }
    } catch {
      /* ignore */
    }
    return {
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      logoUrl: "",
    };
  }, []);

  if (!loading && (!orders || !orders.length)) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-900 dark:text-white">No orders found</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting filters or date range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BulkActionBar
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        onClear={clearSelection}
        onUpdated={onOrdersChanged}
        getStoreSettings={getStoreSettings}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
            <table className="min-w-[1140px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allOnPageSelected && pageIds.length > 0}
                    onChange={toggleAllPage}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563eb] accent-[#2563eb] focus:ring-[#2563eb]"
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Live status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    </tr>
                  ))
                : orders.map((o) => {
                    const isRowSel = !!selected[o.id];
                    return (
                      <tr
                        key={o.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/orders/${o.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/orders/${o.id}`);
                          }
                        }}
                        className={[
                          "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          isRowSel ? "bg-[#eff6ff] hover:bg-[#eff6ff] dark:bg-blue-950/30 dark:hover:bg-blue-950/30" : "",
                        ].join(" ")}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isRowSel}
                            onChange={(e) => toggleRow(o.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-[#2563eb] accent-[#2563eb] focus:ring-[#2563eb]"
                            aria-label={`Select order ${o.orderNumber}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                          {o.orderNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{o.customerName}</div>
                          {o.customerEmail ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{o.customerEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {o.shippingCity ? (
                            <span
                              style={{ fontSize: 12, color: "#6b7280" }}
                              className="dark:text-slate-400"
                            >
                              {o.shippingCity}
                              {o.shippingCountry ? `, ${o.shippingCountry}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                          {o.lineCount} line{o.lineCount !== 1 ? "s" : ""} · {o.itemCount} pc
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(o.total)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              orderStatusBadgeClass(o.orderStatus),
                            ].join(" ")}
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              paymentStatusBadgeClass(o.paymentStatus),
                            ].join(" ")}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {o.liveStatus ? (
                            <div>
                              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                {o.liveStatus}
                              </div>
                              {o.liveLocation ? (
                                <div className="mt-0.5 max-w-[160px] truncate text-[11px] text-slate-500" title={o.liveLocation}>
                                  {o.liveLocation}
                                </div>
                              ) : null}
                            </div>
                          ) : o.trackingNumber ? (
                            <span className="text-[11px] text-slate-400">Not refreshed</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/orders/${o.id}`}
                            className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1d6fb8] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
