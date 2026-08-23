/**
 * Orders list table: dual status, guest display, courier column, sort, bulk select.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isStaleOrder, pendingAgeBadge } from "@/lib/orderUi";
import { formatCustomerListMeta } from "@/lib/guestCustomerDisplay";
import { DualStatusBadges } from "./DualStatusBadges";
import { BulkActionBar } from "./BulkActionBar";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function startOfLocalDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Relative day labels for recent dates; no time. */
function formatDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    const diffDays = Math.round(
      (startOfLocalDay(date).getTime() - startOfLocalDay(new Date()).getTime()) / 86_400_000
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (Math.abs(diffDays) <= 4) {
      return date.toLocaleDateString(undefined, { weekday: "long" });
    }
    return date.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 uppercase tracking-wide hover:opacity-80"
      style={{ color: "inherit" }}
    >
      {label}
      <span className="text-[10px] opacity-70" aria-hidden>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export function OrdersTable({ orders, page, totalPages, onPageChange, loading, onOrdersChanged }) {
  const router = useRouter();
  const [selected, setSelected] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const pageIds = useMemo(() => (orders || []).map((o) => o.id), [orders]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;
  const someOnPageSelected = pageIds.some((id) => selected[id]);
  const headerIndeterminate = someOnPageSelected && !allOnPageSelected;
  const headerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate, allOnPageSelected, loading]);

  const toggleSort = useCallback((key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const displayOrders = useMemo(() => {
    const list = [...(orders || [])];
    if (!sortKey) return list;
    const mul = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "date") {
        return ((new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0)) * mul;
      }
      if (sortKey === "total") {
        return (Number(a.total) - Number(b.total)) * mul;
      }
      return 0;
    });
    return list;
  }, [orders, sortKey, sortDir]);

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
      <div
        className="rounded-xl border border-dashed p-12 text-center"
        style={{
          background: "var(--bg-panel)",
          borderColor: "var(--border-hairline)",
          color: "var(--text-primary)",
        }}
      >
        <p className="text-sm font-medium">No orders found</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Try adjusting filters or date range.
        </p>
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

      <div
        className="overflow-hidden rounded-xl border shadow-none"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1140px] w-full text-left text-sm">
            <thead
              className="border-b text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: "var(--border-hairline)",
                background: "color-mix(in srgb, var(--bg-base) 65%, var(--bg-panel))",
                color: "var(--text-muted)",
              }}
            >
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allOnPageSelected && pageIds.length > 0}
                    onChange={toggleAllPage}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--accent-line)" }}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Date"
                    active={sortKey === "date"}
                    dir={sortDir}
                    onClick={() => toggleSort("date")}
                  />
                </th>
                <th className="px-4 py-3">Days pending</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Total"
                    active={sortKey === "total"}
                    dir={sortDir}
                    onClick={() => toggleSort("total")}
                  />
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Courier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="px-4 py-3">
                        <div
                          className="h-4 animate-pulse rounded"
                          style={{ background: "var(--border-hairline)" }}
                        />
                      </td>
                    </tr>
                  ))
                : displayOrders.map((o) => {
                    const isRowSel = !!selected[o.id];
                    const age = pendingAgeBadge(o.createdAt, o.orderStatus, o.paymentStatus);
                    const customer = formatCustomerListMeta({
                      name: o.customerName,
                      email: o.customerEmail,
                      phone: o.customerPhone,
                    });
                    const tags = Array.isArray(o.tags) ? o.tags : [];
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
                        className="cursor-pointer"
                        style={{
                          background: isRowSel
                            ? "color-mix(in srgb, var(--accent-line) 8%, var(--bg-panel))"
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isRowSel) {
                            e.currentTarget.style.background =
                              "color-mix(in srgb, var(--bg-base) 55%, var(--bg-panel))";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isRowSel
                            ? "color-mix(in srgb, var(--accent-line) 8%, var(--bg-panel))"
                            : "";
                        }}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isRowSel}
                            onChange={(e) => toggleRow(o.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded"
                            style={{ accentColor: "var(--accent-line)" }}
                            aria-label={`Select order ${o.orderNumber}`}
                          />
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <div className="whitespace-nowrap">{o.orderNumber}</div>
                          {tags.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {tags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    background:
                                      "color-mix(in srgb, var(--accent-money) 12%, transparent)",
                                    color: "var(--accent-money)",
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3" style={{ color: "var(--text-muted)" }}>
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {age ? (
                              <span
                                title={`Age bracket ${age.bracket} days`}
                                className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
                                style={age.style}
                              >
                                {age.label}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                —
                              </span>
                            )}
                            {o.isStale ||
                            isStaleOrder(o.orderStatus, o.paymentStatus, o.createdAt) ? (
                              <span
                                className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--accent-attention) 16%, transparent)",
                                  color: "var(--accent-attention)",
                                }}
                                title="Pending + unpaid for 10+ days — needs human triage"
                              >
                                Stale · 10d+
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                              {customer.primary}
                            </span>
                            {o.isRepeatToday ? (
                              <span
                                className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--accent-attention) 14%, transparent)",
                                  color: "var(--accent-attention)",
                                }}
                                title={`${o.ordersLast24h || 0} orders from this phone in the last 24h`}
                              >
                                {o.ordersLast24h || 2} today
                              </span>
                            ) : null}
                          </div>
                          {customer.secondary ? (
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {customer.secondary}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {o.shippingCity ? (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {o.shippingCity}
                              {o.shippingCountry ? `, ${o.shippingCountry}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3" style={{ color: "var(--text-primary)" }}>
                          {o.lineCount} line{o.lineCount !== 1 ? "s" : ""} · {o.itemCount} pc
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-3 font-medium tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatMoney(o.total)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DualStatusBadges orderStatus={o.orderStatus} paymentStatus={o.paymentStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {o.liveStatus ? (
                            <div>
                              <div className="text-xs font-semibold" style={{ color: "var(--accent-line)" }}>
                                {o.liveStatus}
                              </div>
                              {o.liveLocation ? (
                                <div
                                  className="mt-0.5 max-w-[160px] truncate text-[11px]"
                                  style={{ color: "var(--text-muted)" }}
                                  title={o.liveLocation}
                                >
                                  {o.liveLocation}
                                </div>
                              ) : null}
                            </div>
                          ) : o.trackingNumber ? (
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--text-muted)" }}
                              title="Click bulk ↻ Live status after booking Postex"
                            >
                              Courier not refreshed
                            </span>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                              title="No tracking booked yet"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/orders/${o.id}`}
                            className="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
                            style={{
                              borderColor: "var(--border-hairline)",
                              background: "var(--bg-panel)",
                              color: "var(--accent-line)",
                            }}
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
          <div
            className="flex items-center justify-between border-t px-4 py-3 text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="rounded-md border px-3 py-1 font-medium disabled:opacity-40"
                style={{ borderColor: "var(--border-hairline)", color: "var(--text-primary)" }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="rounded-md border px-3 py-1 font-medium disabled:opacity-40"
                style={{ borderColor: "var(--border-hairline)", color: "var(--text-primary)" }}
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
