/**
 * Stock report page: stats, filters, table, export, and print layout.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { StockTable } from "./StockTable";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk';

function StatCard({ title, value, tone }) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50",
    yellow:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function StockReport() {
  const [summary, setSummary] = useState({ outOfStock: 0, lowStock: 0, healthy: 0 });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("stock_asc");
  const [printRows, setPrintRows] = useState([]);
  const [printSummary, setPrintSummary] = useState(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (status !== "all") p.set("status", status);
    if (category) p.set("category", category);
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [search, status, category, sort]);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/stock?${queryString}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not load stock report.");
        return;
      }
      setSummary(json.summary || { outOfStock: 0, lowStock: 0, healthy: 0 });
      setProducts(json.products || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories?page=1&limit=100", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onProductUpdated = useCallback(() => {
    loadStock();
  }, [loadStock]);

  function downloadCsv() {
    const q = queryString ? `?${queryString}` : "";
    window.open(`/api/reports/stock/export${q}`, "_blank", "noopener,noreferrer");
  }

  async function preparePrint() {
    try {
      const res = await fetch("/api/reports/stock?sort=stock_asc", { credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        toast.error("Could not prepare print view.");
        return;
      }
      setPrintRows(json.products || []);
      setPrintSummary(json.summary || null);
      requestAnimationFrame(() => {
        window.print();
      });
    } catch {
      toast.error("Could not prepare print view.");
    }
  }

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Stock Report</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Monitor inventory levels and manage restocking
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={preparePrint}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => loadStock()}
              disabled={loading}
              className="rounded-lg bg-[#1d6fb8] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#185d9c] disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Out of stock" value={summary.outOfStock} tone="red" />
          <StatCard title="Low stock" value={summary.lowStock} tone="yellow" />
          <StatCard title="Healthy stock" value={summary.healthy} tone="green" />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              type="search"
              placeholder="Search name or article no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="all">All statuses</option>
              <option value="out">Out of stock</option>
              <option value="low">Low stock</option>
              <option value="healthy">Healthy</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="stock_asc">Stock (low to high)</option>
              <option value="stock_desc">Stock (high to low)</option>
              <option value="name">Product name</option>
              <option value="updated">Last updated</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          {loading && !products.length ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ) : (
            <StockTable products={products} onProductUpdated={onProductUpdated} />
          )}
        </div>
      </div>

      <div className="hidden print:block print:p-8">
        <header className="mb-6 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-black">Stock Report — {STORE_NAME}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generated on {new Date().toLocaleString()}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span>
              <strong>Out of stock:</strong> {(printSummary || summary).outOfStock}
            </span>
            <span>
              <strong>Low stock:</strong> {(printSummary || summary).lowStock}
            </span>
            <span>
              <strong>Healthy:</strong> {(printSummary || summary).healthy}
            </span>
          </div>
        </header>
        <table className="w-full border-collapse text-left text-xs text-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 pr-2">Product</th>
              <th className="py-2 pr-2">Article</th>
              <th className="py-2 pr-2">Category</th>
              <th className="py-2 pr-2">Qty</th>
              <th className="py-2 pr-2">Threshold</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(printRows.length ? printRows : products).map((p) => {
              const label =
                p.status === "out"
                  ? "Out of Stock"
                  : p.status === "low"
                    ? "Low Stock"
                    : p.status === "untracked"
                      ? "Not tracked"
                      : "Healthy";
              return (
                <tr key={`print-${p.id}`} className="border-b border-slate-300">
                  <td className="py-1.5 pr-2">{p.name}</td>
                  <td className="py-1.5 pr-2">{p.articleNo || "—"}</td>
                  <td className="py-1.5 pr-2">{p.categoryLabel}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{p.quantity}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{p.trackInventory ? p.threshold : "—"}</td>
                  <td className="py-1.5">{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
