/**
 * Orders list table: compact single-line rows, sticky header, pagination.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isStaleOrder, pendingAgeBadge } from "@/lib/orderUi";
import { formatCustomerListMeta, formatPhoneDisplay } from "@/lib/guestCustomerDisplay";
import { CustomerConfirmBadge } from "./CustomerConfirmBadge";
import { OrderStatusBadges } from "./OrderStatusBadges";
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

const CELL = "px-3 py-2"; // ~44–48px row with single-line content

export function OrdersTable({
  orders,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  sortKey,
  sortDir,
  onSortChange,
  loading,
  onOrdersChanged,
  searchQuery = "",
}) {
  const router = useRouter();
  const [selected, setSelected] = useState({});

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

  const rangeFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeTo = Math.min(page * limit, total);

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
    const q = String(searchQuery || "").trim();
    const trackingHint = /^[A-Za-z]{0,4}\d{8,}$/.test(q.replace(/[\s_-]/g, "")) || /^(GW|PE|PX)/i.test(q);
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
          {trackingHint
            ? `No order is linked to tracking “${q}”. Check the CN on the courier label, or open the order and confirm tracking was saved.`
            : "Try adjusting filters or date range."}
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
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="min-w-[1260px] w-full text-left text-sm">
            <thead
              className="sticky top-0 z-20 border-b text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: "var(--border-hairline)",
                background: "color-mix(in srgb, var(--bg-base) 65%, var(--bg-panel))",
                color: "var(--text-muted)",
                boxShadow: "0 1px 0 var(--border-hairline)",
              }}
            >
              <tr>
                <th className={`w-10 ${CELL}`}>
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
                <th className={CELL}>Order #</th>
                <th className={CELL}>
                  <SortHeader
                    label="Date"
                    active={sortKey === "date"}
                    dir={sortDir}
                    onClick={() => onSortChange?.("date")}
                  />
                </th>
                <th className={CELL}>Days pending</th>
                <th className={CELL}>Customer</th>
                <th className={CELL}>Location</th>
                <th className={CELL}>Items</th>
                <th className={CELL}>
                  <SortHeader
                    label="Total"
                    active={sortKey === "total"}
                    dir={sortDir}
                    onClick={() => onSortChange?.("total")}
                  />
                </th>
                <th className={CELL}>Status</th>
                <th className={CELL}>Customer confirm</th>
                <th className={CELL}>Courier</th>
                <th className={`${CELL} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={12} className={CELL}>
                        <div
                          className="h-3.5 animate-pulse rounded"
                          style={{ background: "var(--border-hairline)" }}
                        />
                      </td>
                    </tr>
                  ))
                : (orders || []).map((o) => {
                    const isRowSel = !!selected[o.id];
                    const age = pendingAgeBadge(o.createdAt, o.orderStatus, o.paymentStatus);
                    const customer = formatCustomerListMeta({
                      name: o.customerName,
                      email: o.customerEmail,
                      phone: o.customerPhone,
                    });
                    const phoneInline = formatPhoneDisplay(customer.phone || o.customerPhone);
                    const tags = Array.isArray(o.tags) ? o.tags : [];
                    const stale =
                      o.isStale || isStaleOrder(o.orderStatus, o.paymentStatus, o.createdAt);
                    const courierLabel = o.liveStatus
                      ? o.liveStatus
                      : o.trackingNumber
                        ? "Not refreshed"
                        : "—";
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
                          height: 46,
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
                        <td className={CELL} onClick={(e) => e.stopPropagation()}>
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
                          className={`${CELL} max-w-[9rem] font-mono text-xs font-medium`}
                          style={{ color: "var(--text-primary)" }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                            <span className="truncate">{o.orderNumber}</span>
                            {tags.slice(0, 1).map((t) => (
                              <span
                                key={t}
                                className="inline-flex shrink-0 rounded px-1 py-0 text-[9px] font-semibold"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--accent-money) 12%, transparent)",
                                  color: "var(--accent-money)",
                                }}
                                title={tags.join(", ")}
                              >
                                {t}
                                {tags.length > 1 ? ` +${tags.length - 1}` : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td
                          className={`${CELL} whitespace-nowrap text-xs`}
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatDate(o.createdAt)}
                        </td>
                        <td className={`${CELL} whitespace-nowrap`}>
                          <div className="inline-flex items-center gap-1">
                            {age ? (
                              <span
                                title={`Age bracket ${age.bracket} days`}
                                className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                                style={age.style}
                              >
                                {age.label}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                —
                              </span>
                            )}
                            {stale ? (
                              <span
                                className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--accent-attention) 16%, transparent)",
                                  color: "var(--accent-attention)",
                                }}
                                title="Pending + unpaid for 10+ days — needs human triage"
                              >
                                Stale
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${CELL} max-w-[14rem]`}>
                          <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                            <span
                              className="truncate font-medium"
                              style={{ color: "var(--text-primary)" }}
                              title={
                                customer.isGuest
                                  ? `Guest checkout${phoneInline ? ` · ${phoneInline}` : ""}`
                                  : customer.primary
                              }
                            >
                              {customer.primary}
                            </span>
                            {phoneInline ? (
                              <span
                                className="shrink-0 text-[11px] tabular-nums"
                                style={{ color: "var(--text-muted)" }}
                              >
                                · {phoneInline}
                              </span>
                            ) : null}
                            {o.isRepeatToday ? (
                              <span
                                className="inline-flex shrink-0 rounded px-1 py-0 text-[10px] font-bold tabular-nums"
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
                        </td>
                        <td className={`${CELL} max-w-[8rem]`}>
                          <span
                            className="block truncate text-xs whitespace-nowrap"
                            style={{ color: "var(--text-muted)" }}
                            title={
                              o.shippingCity
                                ? `${o.shippingCity}${o.shippingCountry ? `, ${o.shippingCountry}` : ""}`
                                : undefined
                            }
                          >
                            {o.shippingCity || "—"}
                          </span>
                        </td>
                        <td
                          className={`${CELL} whitespace-nowrap text-xs`}
                          style={{ color: "var(--text-primary)" }}
                        >
                          {o.lineCount}·{o.itemCount}
                        </td>
                        <td
                          className={`${CELL} whitespace-nowrap font-medium tabular-nums`}
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatMoney(o.total)}
                        </td>
                        <td className={CELL} onClick={(e) => e.stopPropagation()}>
                          <OrderStatusBadges order={o} />
                        </td>
                        <td className={`${CELL} whitespace-nowrap`}>
                          <CustomerConfirmBadge order={o} compact />
                        </td>
                        <td className={`${CELL} max-w-[7rem]`}>
                          <span
                            className="block truncate text-[11px] whitespace-nowrap"
                            style={{
                              color: o.liveStatus ? "var(--accent-line)" : "var(--text-muted)",
                              fontWeight: o.liveStatus ? 600 : 400,
                            }}
                            title={
                              o.liveStatus
                                ? [o.liveStatus, o.liveLocation].filter(Boolean).join(" · ")
                                : o.trackingNumber
                                  ? "Courier not refreshed"
                                  : "No tracking booked yet"
                            }
                          >
                            {courierLabel}
                          </span>
                        </td>
                        <td className={`${CELL} text-right`} onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/orders/${o.id}`}
                            className="inline-flex min-h-[28px] min-w-[44px] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold"
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

        <div
          className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span style={{ color: "var(--text-muted)" }}>
              Showing{" "}
              <span className="tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                {rangeFrom}–{rangeTo}
              </span>{" "}
              of{" "}
              <span className="tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                {total}
              </span>
            </span>
            <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              Rows
              <select
                value={limit}
                onChange={(e) => onLimitChange?.(Number(e.target.value))}
                className="rounded-md border px-2 py-1 text-xs font-semibold"
                style={{
                  borderColor: "var(--border-hairline)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                }}
                aria-label="Rows per page"
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              style={{ borderColor: "var(--border-hairline)", color: "var(--text-primary)" }}
            >
              Previous
            </button>
            <span className="tabular-nums text-xs" style={{ color: "var(--text-muted)" }}>
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading || totalPages <= 1}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              style={{ borderColor: "var(--border-hairline)", color: "var(--text-primary)" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
