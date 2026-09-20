/**
 * Orders list page client: stats, saved views, filters, table, export.
 * Visual chrome matches Shopify Admin Orders (Polaris); all features kept.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { OrderFilters } from "./OrderFilters";
import { OrdersTable } from "./OrdersTable";
import { formatAdminPrice } from "@/lib/currency";
import { looksLikeTrackingId } from "@/lib/orderSearch";
import "@/app/orders-polaris.css";

function formatMoney(n) {
  return formatAdminPrice(n);
}

// Needs Attention is the stale bucket (OR8): pending + unpaid + age >= 10d — not a broader 3d triage.
const SAVED_VIEWS = [
  { key: "all", label: "All" },
  { key: "awaitingCustomer", label: "Awaiting customer" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "unpaid", label: "Unpaid" },
  { key: "needsAttention", label: "Needs Attention" },
  { key: "today", label: "Today" },
];

function StatCard({ label, value, hint, tone }) {
  const valueClass =
    tone === "line"
      ? "op-stat-value is-success"
      : tone === "attention"
        ? "op-stat-value is-critical"
        : tone === "money"
          ? "op-stat-value is-money"
          : "op-stat-value";
  return (
    <div className="op-stat">
      <p className="op-stat-label">{label}</p>
      <p className={valueClass}>{value}</p>
      {hint ? <p className="op-stat-hint">{hint}</p> : null}
    </div>
  );
}

export function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFromUrl = (searchParams.get("productId") || "").trim();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tag, setTag] = useState("");
  const [debouncedTag, setDebouncedTag] = useState("");
  const [customerConfirm, setCustomerConfirm] = useState("all");
  const [view, setView] = useState("all");
  const [productId, setProductId] = useState(productIdFromUrl);
  const [productFilter, setProductFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    processing: 0,
    delivered: 0,
    returned: 0,
    courierSettled: 0,
    deliveryRatio: null,
    returnRatio: null,
    todayRevenue: 0,
    pendingValueAtRisk: 0,
  });
  const [views, setViews] = useState({
    all: 0,
    unfulfilled: 0,
    unpaid: 0,
    needsAttention: 0,
    today: 0,
    awaitingCustomer: 0,
  });
  const [loading, setLoading] = useState(true);
  const [liveSyncBusy, setLiveSyncBusy] = useState(false);
  const [liveSyncProgress, setLiveSyncProgress] = useState("");
  const [liveSyncSummary, setLiveSyncSummary] = useState(null);

  useEffect(() => {
    setProductId(productIdFromUrl);
  }, [productIdFromUrl]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Courier CN / tracking paste: jump to All so shipped orders aren't hidden by tabs
  useEffect(() => {
    if (!debouncedSearch || !looksLikeTrackingId(debouncedSearch)) return;
    if (view !== "all") setView("all");
    if (status !== "all") setStatus("all");
    if (paymentStatus !== "all") setPaymentStatus("all");
    if (customerConfirm !== "all") setCustomerConfirm("all");
  }, [debouncedSearch, view, status, paymentStatus, customerConfirm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTag(tag.trim().toLowerCase()), 350);
    return () => clearTimeout(t);
  }, [tag]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    debouncedTag,
    customerConfirm,
    view,
    limit,
    productId,
  ]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    p.set("sort", sortKey);
    p.set("dir", sortDir);
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (status !== "all") p.set("status", status);
    if (paymentStatus !== "all") p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    if (debouncedTag) p.set("tag", debouncedTag);
    if (customerConfirm !== "all") p.set("customerConfirm", customerConfirm);
    if (view && view !== "all") p.set("view", view);
    if (productId) p.set("productId", productId);
    return p.toString();
  }, [
    page,
    limit,
    sortKey,
    sortDir,
    debouncedSearch,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    debouncedTag,
    customerConfirm,
    view,
    productId,
  ]);

  function onSortChange(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function onLimitChange(next) {
    setLimit(next);
    setPage(1);
  }

  const clearProductFilter = useCallback(() => {
    setProductId("");
    setProductFilter(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("productId");
    const qs = next.toString();
    router.replace(qs ? `/orders?${qs}` : "/orders");
  }, [router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?${queryString}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setOrders([]);
        return;
      }
      setOrders(json.orders || []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      if (json.stats) setStats(json.stats);
      if (json.views) setViews(json.views);
      setProductFilter(json.productFilter || null);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const syncAllLiveOrders = useCallback(async () => {
    const ok = window.confirm(
      "Update all live courier orders?\n\nChecks PostEx + Run Courier tracking and auto-marks Delivered / Returned when the courier confirms."
    );
    if (!ok) return;

    setLiveSyncBusy(true);
    setLiveSyncSummary(null);
    setLiveSyncProgress("Checking courier tracking…");
    try {
      const res = await fetch("/api/orders/sync-live", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 120 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error(json.error || "Live sync failed");
        return;
      }
      setLiveSyncSummary(json);
      const parts = [];
      if (json.scanned != null) parts.push(`${json.scanned} checked`);
      if (json.okCount) parts.push(`${json.okCount} refreshed`);
      if (json.syncedCount) parts.push(`${json.syncedCount} status updated`);
      if (json.failCount) parts.push(`${json.failCount} failed`);
      toast.success(parts.join(" · ") || "Done");
      await load();
    } catch {
      toast.error("Network error while updating live orders");
    } finally {
      setLiveSyncProgress("");
      setLiveSyncBusy(false);
    }
  }, [load]);

  function selectView(key) {
    setView(key);
    if (key !== "all") {
      setStatus("all");
      setPaymentStatus("all");
      setCustomerConfirm("all");
    }
    if (key === "today" || key === "needsAttention") {
      setDateFrom("");
      setDateTo("");
    }
  }

  function onStatusChange(next) {
    setStatus(next);
    if (next !== "all") setView("all");
  }

  function onPaymentStatusChange(next) {
    setPaymentStatus(next);
    if (next !== "all") setView("all");
  }

  function onCustomerConfirmChange(next) {
    setCustomerConfirm(next);
    if (next !== "all") setView("all");
  }

  function exportCsv() {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (status !== "all") p.set("status", status);
    if (paymentStatus !== "all") p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    if (debouncedTag) p.set("tag", debouncedTag);
    if (customerConfirm !== "all") p.set("customerConfirm", customerConfirm);
    if (view && view !== "all") p.set("view", view);
    if (productId) p.set("productId", productId);
    const qs = p.toString();
    window.open(`/api/orders/export${qs ? `?${qs}` : ""}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="orders-polaris -mx-4 -my-5 min-h-[calc(100vh-3.5rem)] space-y-4 px-4 py-5 md:-mx-6 md:-my-6 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="op-title">Orders</h1>
          <p className="op-subtitle">{total.toLocaleString()} orders match filters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="op-btn op-btn-secondary"
          >
            Export
          </button>
          <button
            type="button"
            disabled={liveSyncBusy}
            onClick={() => void syncAllLiveOrders()}
            className="op-btn op-btn-secondary"
            title="Refresh PostEx + Run Courier tracking for all in-transit orders and auto-set Delivered / Returned"
          >
            {liveSyncProgress || "Update live orders"}
          </button>
          <Link href="/orders/new" className="op-btn op-btn-primary">
            Create order
          </Link>
        </div>
      </div>

      {liveSyncSummary ? (
        <div className="op-banner">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 650, color: "#008060" }}>
                Live sync results
              </p>
              <p className="op-muted" style={{ margin: "4px 0 0" }}>
                Checked {liveSyncSummary.scanned ?? 0} · refreshed {liveSyncSummary.okCount ?? 0} ·
                status synced {liveSyncSummary.syncedCount ?? 0} · failed {liveSyncSummary.failCount ?? 0}
              </p>
            </div>
            <button
              type="button"
              className="op-btn op-btn-secondary"
              style={{ minHeight: 28, padding: "4px 10px" }}
              onClick={() => setLiveSyncSummary(null)}
            >
              Dismiss
            </button>
          </div>
          {(liveSyncSummary.results || []).some((r) => r.orderStatusSynced) ? (
            <ul
              className="mt-2 max-h-40 space-y-1 overflow-auto"
              style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--p-text)" }}
            >
              {(liveSyncSummary.results || [])
                .filter((r) => r.orderStatusSynced)
                .slice(0, 40)
                .map((r) => {
                  const to = String(r.orderStatusSynced?.to || r.orderStatusSynced || "").toLowerCase();
                  const color = to === "returned" ? "#E67E22" : "#008060";
                  return (
                    <li key={r.orderId}>
                      <span style={{ fontWeight: 650 }}>{r.orderNumber}</span>
                      {" → "}
                      <span style={{ color }}>{r.orderStatusSynced.to || r.orderStatusSynced}</span>
                      {r.status ? <span className="op-muted"> ({r.status})</span> : null}
                    </li>
                  );
                })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {productId ? (
        <div className="op-banner flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="op-stat-label">Filtered by product</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 550 }}>
              {productFilter?.name || "Selected product"}
              {productFilter?.articleNo ? (
                <span className="op-muted" style={{ marginLeft: 8, fontWeight: 400 }}>
                  ({productFilter.articleNo})
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/catalog/products/${productId}`} className="op-btn op-btn-secondary">
              Open product
            </a>
            <button type="button" onClick={clearProductFilter} className="op-btn op-btn-secondary">
              Clear product filter
            </button>
          </div>
        </div>
      ) : null}

      <div className="op-stats">
        <StatCard label="Orders" value={stats.totalOrders} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Processing" value={stats.processing} />
        <StatCard
          label="Delivery ratio"
          value={stats.deliveryRatio != null ? `${stats.deliveryRatio}%` : "—"}
          tone="line"
          hint={`${stats.delivered || 0} delivered of settled`}
        />
        <StatCard
          label="Return ratio"
          value={stats.returnRatio != null ? `${stats.returnRatio}%` : "—"}
          tone="attention"
          hint={`${stats.returned || 0} returned of settled`}
        />
        <StatCard
          label="Pending value at risk"
          value={formatMoney(stats.pendingValueAtRisk || 0)}
          tone="attention"
          hint="Pending + unpaid order totals"
        />
        <StatCard label="Today's revenue" value={formatMoney(stats.todayRevenue)} tone="money" />
      </div>

      {(stats.courierSettled || 0) > 0 ? (
        <div className="op-banner">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p style={{ margin: 0, fontSize: 12, fontWeight: 550 }}>Courier portion (all-time settled)</p>
            <p className="op-muted" style={{ margin: 0, fontSize: 11 }}>
              {stats.delivered || 0} delivered · {stats.returned || 0} returned · {stats.courierSettled}{" "}
              settled
            </p>
          </div>
          <div className="op-courier-bar" style={{ marginTop: 8 }}>
            <div className="flex h-full w-full">
              <div
                className="h-full"
                style={{ width: `${stats.deliveryRatio || 0}%`, background: "#008060" }}
              />
              <div
                className="h-full"
                style={{ width: `${stats.returnRatio || 0}%`, background: "#E67E22" }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="op-card">
        <div className="op-card-pad">
          <div className="op-tabs" role="tablist" aria-label="Saved views">
            {SAVED_VIEWS.map((v) => {
              const active = view === v.key;
              const count = views[v.key] ?? 0;
              return (
                <button
                  key={v.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectView(v.key)}
                  className="op-tab"
                >
                  {v.label}
                  <span className="op-tab-count">{count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>

          <OrderFilters
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={onStatusChange}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={onPaymentStatusChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            tag={tag}
            onTagChange={setTag}
            customerConfirm={customerConfirm}
            onCustomerConfirmChange={onCustomerConfirmChange}
          />
        </div>

        <OrdersTable
          orders={orders}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={onLimitChange}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={onSortChange}
          loading={loading}
          onOrdersChanged={load}
          searchQuery={debouncedSearch}
          embedded
        />
      </div>
    </div>
  );
}
