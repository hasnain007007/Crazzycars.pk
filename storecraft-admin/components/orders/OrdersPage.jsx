/**
 * Orders list page client: stats, filters, table, export.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderFilters } from "./OrderFilters";
import { OrdersTable } from "./OrdersTable";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

export function OrdersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    processing: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, paymentStatus, dateFrom, dateTo]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (status !== "all") p.set("status", status);
    if (paymentStatus !== "all") p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    return p.toString();
  }, [page, debouncedSearch, status, paymentStatus, dateFrom, dateTo]);

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
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (status !== "all") p.set("status", status);
    if (paymentStatus !== "all") p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    const qs = p.toString();
    window.open(`/api/orders/export${qs ? `?${qs}` : ""}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{total} orders match filters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/orders/new"
            className="shrink-0 rounded-lg bg-[#1A7A4C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#15663f]"
          >
            + New invoice
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total orders", value: stats.totalOrders, tone: "bg-white dark:bg-slate-900" },
          { label: "Pending", value: stats.pending, tone: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "Processing", value: stats.processing, tone: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Today's revenue", value: formatMoney(stats.todayRevenue), tone: "bg-emerald-50 dark:bg-emerald-950/20" },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-700 ${c.tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <OrderFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={setPaymentStatus}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <OrdersTable
        orders={orders}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        onOrdersChanged={load}
      />
    </div>
  );
}
