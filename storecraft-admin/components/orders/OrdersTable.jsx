/**
 * Orders list table: Shopify Polaris density, sticky header, pagination.
 * All columns and bulk actions retained.
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
import { resolveInvoiceLogoUrl } from "@/lib/invoiceStoreMeta";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function startOfLocalDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Shopify-style relative datetime: "Today at 9:17 pm". */
function formatDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    const time = date
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
    const diffDays = Math.round(
      (startOfLocalDay(date).getTime() - startOfLocalDay(new Date()).getTime()) / 86_400_000
    );
    if (diffDays === 0) return `Today at ${time}`;
    if (diffDays === -1) return `Yesterday at ${time}`;
    if (diffDays === 1) return `Tomorrow at ${time}`;
    if (Math.abs(diffDays) <= 4) {
      const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
      return `${weekday} at ${time}`;
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function orderDisplayNumber(n) {
  const s = String(n || "").trim();
  if (!s) return "—";
  return s.startsWith("#") ? s : `#${s}`;
}

function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:opacity-80"
      style={{ color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
    >
      {label}
      <span style={{ fontSize: 10, opacity: 0.7 }} aria-hidden>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

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
  embedded = false,
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
          logoUrl: resolveInvoiceLogoUrl(g.logoUrl || g.logo?.url || ""),
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
    const trackingHint =
      /^[A-Za-z]{0,4}\d{8,}$/.test(q.replace(/[\s_-]/g, "")) || /^(GW|PE|PX)/i.test(q);
    return (
      <div>
        <BulkActionBar
          selectedIds={selectedIds}
          selectedCount={selectedCount}
          onClear={clearSelection}
          onUpdated={onOrdersChanged}
          getStoreSettings={getStoreSettings}
        />
        <div className="op-footer" style={{ borderTop: embedded ? "1px solid var(--p-border)" : undefined }}>
          <div style={{ width: "100%", textAlign: "center", padding: "40px 16px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 550 }}>No orders found</p>
            <p className="op-muted" style={{ margin: "4px 0 0" }}>
              {trackingHint
                ? `No order is linked to tracking “${q}”. Check the CN on the courier label, or open the order and confirm tracking was saved.`
                : "Try adjusting filters or date range."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BulkActionBar
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        onClear={clearSelection}
        onUpdated={onOrdersChanged}
        getStoreSettings={getStoreSettings}
      />

      <div className="op-table-wrap">
        <table className="op-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allOnPageSelected && pageIds.length > 0}
                  onChange={toggleAllPage}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select all on this page"
                />
              </th>
              <th>Order</th>
              <th>
                <SortHeader
                  label="Date"
                  active={sortKey === "date"}
                  dir={sortDir}
                  onClick={() => onSortChange?.("date")}
                />
              </th>
              <th>Days pending</th>
              <th>Customer</th>
              <th>Location</th>
              <th>Items</th>
              <th>
                <SortHeader
                  label="Total"
                  active={sortKey === "total"}
                  dir={sortDir}
                  onClick={() => onSortChange?.("total")}
                />
              </th>
              <th>Payment status</th>
              <th>Fulfillment status</th>
              <th>Customer confirm</th>
              <th>Delivery status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={13}>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 4,
                          background: "#ebebeb",
                          animation: "pulse 1.2s ease-in-out infinite",
                        }}
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
                      ? "Tracking added"
                      : "—";
                  return (
                    <tr
                      key={o.id}
                      role="link"
                      tabIndex={0}
                      className={isRowSel ? "is-selected" : undefined}
                      onClick={() => router.push(`/orders/${o.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/orders/${o.id}`);
                        }
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isRowSel}
                          onChange={(e) => toggleRow(o.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select order ${o.orderNumber}`}
                        />
                      </td>
                      <td>
                        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
                          <Link
                            href={`/orders/${o.id}`}
                            className="op-order-link truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {orderDisplayNumber(o.orderNumber)}
                          </Link>
                          {tags.slice(0, 1).map((t) => (
                            <span
                              key={t}
                              className="op-pill"
                              style={{
                                background: "#E4E5E7",
                                color: "#4A4A4A",
                                maxWidth: "4rem",
                                height: 18,
                                fontSize: 11,
                              }}
                              title={tags.join(", ")}
                            >
                              {t}
                              {tags.length > 1 ? ` +${tags.length - 1}` : ""}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="op-muted block truncate">{formatDate(o.createdAt)}</span>
                      </td>
                      <td>
                        <div className="inline-flex max-w-full items-center gap-1 overflow-hidden">
                          {age ? (
                            <span
                              title={`Age bracket ${age.bracket} days`}
                              className="op-pill"
                              style={age.style}
                            >
                              {age.label}
                            </span>
                          ) : (
                            <span className="op-muted">—</span>
                          )}
                          {stale ? (
                            <span
                              className="op-pill"
                              style={{ background: "#FED3D1", color: "#8E1F0B" }}
                              title="Pending + unpaid for 10+ days — needs human triage"
                            >
                              Stale
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="flex min-w-0 flex-col gap-0 overflow-hidden">
                          <span
                            className="truncate"
                            style={{ fontWeight: 550 }}
                            title={
                              customer.isGuest
                                ? `Guest checkout${phoneInline ? ` · ${phoneInline}` : ""}`
                                : customer.primary
                            }
                          >
                            {customer.primary}
                          </span>
                          {phoneInline ? (
                            <span className="op-muted truncate" style={{ fontSize: 12 }}>
                              {phoneInline}
                            </span>
                          ) : null}
                          {o.isRepeatToday ? (
                            <span
                              className="op-pill"
                              style={{ background: "#FED3D1", color: "#8E1F0B", height: 18, fontSize: 11 }}
                              title={`${o.ordersLast24h || 0} orders from this phone in the last 24h`}
                            >
                              {o.ordersLast24h || 2} today
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span
                          className="op-muted block truncate"
                          title={
                            o.shippingCity
                              ? `${o.shippingCity}${o.shippingCountry ? `, ${o.shippingCountry}` : ""}`
                              : undefined
                          }
                        >
                          {o.shippingCity || "—"}
                        </span>
                      </td>
                      <td className="truncate">
                        {o.itemCount === 1 ? "1 item" : `${o.itemCount || 0} items`}
                      </td>
                      <td className="truncate" style={{ fontWeight: 550, fontVariantNumeric: "tabular-nums" }}>
                        {formatMoney(o.total)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <OrderStatusBadges order={o} mode="payment" />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <OrderStatusBadges order={o} mode="fulfillment" />
                      </td>
                      <td>
                        <CustomerConfirmBadge order={o} compact />
                      </td>
                      <td>
                        <span
                          className="op-pill"
                          style={{
                            background: o.liveStatus || o.trackingNumber ? "#E4E5E7" : "transparent",
                            color: o.liveStatus ? "#0C5132" : "#616161",
                            maxWidth: "100%",
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
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <Link href={`/orders/${o.id}`} className="op-btn op-btn-secondary" style={{ minHeight: 28, padding: "4px 10px" }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <div className="op-footer">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Showing{" "}
            <span style={{ fontWeight: 550, color: "var(--p-text)", fontVariantNumeric: "tabular-nums" }}>
              {rangeFrom}–{rangeTo}
            </span>{" "}
            of{" "}
            <span style={{ fontWeight: 550, color: "var(--p-text)", fontVariantNumeric: "tabular-nums" }}>
              {total}
            </span>
          </span>
          <label className="inline-flex items-center gap-1.5" style={{ fontSize: 12 }}>
            Rows
            <select
              value={limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className="op-select"
              style={{ minHeight: 28, padding: "2px 8px" }}
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
            className="op-btn op-btn-secondary"
            style={{ minHeight: 28, padding: "4px 10px" }}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading || totalPages <= 1}
            onClick={() => onPageChange(page + 1)}
            className="op-btn op-btn-secondary"
            style={{ minHeight: 28, padding: "4px 10px" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
