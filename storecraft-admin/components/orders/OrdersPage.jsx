/**
 * Orders list page client: stats, saved views, filters, table, export.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { OrderFilters } from "./OrderFilters";
import { OrdersTable } from "./OrdersTable";
import { InstrumentStatCard } from "@/components/ui/InstrumentStatCard";
import { formatAdminPrice } from "@/lib/currency";

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
    <div
      className="orders-instrument -mx-4 -my-5 min-h-[calc(100vh-3.5rem)] space-y-6 px-4 py-5 md:-mx-6 md:-my-6 md:px-6 md:py-6"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Orders
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {total} orders match filters
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={liveSyncBusy}
            onClick={() => void syncAllLiveOrders()}
            className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            style={{
              background: liveSyncBusy ? "var(--text-muted)" : "#008060",
              minWidth: "14rem",
            }}
            title="Refresh PostEx + Run Courier tracking for all in-transit orders and auto-set Delivered / Returned"
          >
            {liveSyncProgress || "↻ Update all live orders"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold shadow-none hover:opacity-90"
            style={{
              background: "var(--bg-panel)",
              borderColor: "var(--border-hairline)",
              color: "var(--text-primary)",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {liveSyncSummary ? (
        <div
          className="rounded-xl border px-4 py-3"
          style={{
            background: "color-mix(in srgb, #008060 8%, var(--bg-panel))",
            borderColor: "var(--border-hairline)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#008060" }}>
                Live sync results
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-primary)" }}>
                Checked {liveSyncSummary.scanned ?? 0} · refreshed {liveSyncSummary.okCount ?? 0} ·
                status synced {liveSyncSummary.syncedCount ?? 0} · failed {liveSyncSummary.failCount ?? 0}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold hover:underline"
              style={{ color: "#008060" }}
              onClick={() => setLiveSyncSummary(null)}
            >
              Dismiss
            </button>
          </div>
          {(liveSyncSummary.results || []).some((r) => r.orderStatusSynced) ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs" style={{ color: "var(--text-primary)" }}>
              {(liveSyncSummary.results || [])
                .filter((r) => r.orderStatusSynced)
                .slice(0, 40)
                .map((r) => (
                  <li key={r.orderId}>
                    <span className="font-bold">{r.orderNumber}</span>
                    {" → "}
                    <span style={{ color: "#008060" }}>
                      {r.orderStatusSynced.to || r.orderStatusSynced}
                    </span>
                    {r.status ? (
                      <span style={{ color: "var(--text-muted)" }}> ({r.status})</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {productId ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--accent-line) 8%, var(--bg-panel))",
            borderColor: "var(--border-hairline)",
          }}
        >
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Filtered by product
            </p>
            <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {productFilter?.name || "Selected product"}
              {productFilter?.articleNo ? (
                <span className="ml-2 font-normal" style={{ color: "var(--text-muted)" }}>
                  ({productFilter.articleNo})
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/catalog/products/${productId}`}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--border-hairline)",
                color: "var(--text-primary)",
              }}
            >
              Open product
            </a>
            <button
              type="button"
              onClick={clearProductFilter}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--border-hairline)",
                color: "var(--text-primary)",
              }}
            >
              Clear product filter
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <InstrumentStatCard label="Total orders" value={stats.totalOrders} />
        <InstrumentStatCard label="Pending" value={stats.pending} />
        <InstrumentStatCard label="Processing" value={stats.processing} />
        <InstrumentStatCard
          label="Pending value at risk"
          value={formatMoney(stats.pendingValueAtRisk || 0)}
          tone="attention"
          money
          hint="Pending + unpaid order totals"
        />
        <InstrumentStatCard
          label="Today's revenue"
          value={formatMoney(stats.todayRevenue)}
          tone="money"
          money
        />
      </div>

      <div
        className="flex flex-wrap gap-1 rounded-xl border p-1.5"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
        role="tablist"
        aria-label="Saved views"
      >
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
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                active
                  ? {
                      background: "color-mix(in srgb, var(--accent-line) 14%, transparent)",
                      color: "var(--accent-line)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {v.label}
              <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
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
      />
    </div>
  );
}
