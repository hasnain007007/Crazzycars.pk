/**
 * Orders list page client: stats, saved views, filters, table, export.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  }, [debouncedSearch, status, paymentStatus, dateFrom, dateTo, debouncedTag, customerConfirm, view, limit]);

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
    return p.toString();
  }, [page, limit, sortKey, sortDir, debouncedSearch, status, paymentStatus, dateFrom, dateTo, debouncedTag, customerConfirm, view]);

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
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
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
