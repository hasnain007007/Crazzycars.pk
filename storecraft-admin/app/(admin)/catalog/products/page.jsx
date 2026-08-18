/**
 * Products list: stats, filters, table, bulk delete, pagination.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductBulkAddOnsModal } from "@/components/products/ProductBulkAddOnsModal";
import { ProductBulkSpreadsheet } from "@/components/products/ProductBulkSpreadsheet";
import { CsvImportExportBar } from "@/components/ui/CsvImportExportBar";

function EmptyIllustration() {
  return (
    <svg className="mx-auto h-32 w-32 text-[#e5e7eb]" viewBox="0 0 120 120" fill="none" aria-hidden>
      <rect x="20" y="28" width="80" height="64" rx="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="44" cy="52" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M20 88 L48 60 L68 78 L100 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, lowStock: 0 });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkAddOnsOpen, setBulkAddOnsOpen] = useState(false);
  const [bulkSpreadsheetOpen, setBulkSpreadsheetOpen] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories?page=1&limit=500", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success) setCategories(json.data || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
      setRows(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total ?? 0);
      if (json.stats) setStats(json.stats);
    } catch (e) {
      toast.error(e.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, category]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, status, category]);

  const hasSelection = selectedIds.size > 0;
  const pageAllSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(String(r._id)));
  const canSelectAllMatching = total > 0 && (!pageAllSelected || selectedIds.size < total);

  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "200", lite: "1", stats: "0" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const res = await fetch(`/api/products?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to select all");
      const ids = (json.data || []).map((r) => String(r._id));
      if (!ids.length) {
        toast.error("No products to select");
        return;
      }
      setSelectedIds(new Set(ids));
      const capped = (json.total ?? ids.length) > ids.length;
      toast.success(
        capped
          ? `Selected first ${ids.length} of ${json.total} matching (bulk max 200)`
          : `Selected all ${ids.length} matching product(s)`
      );
    } catch (e) {
      toast.error(e.message || "Select all failed");
    } finally {
      setSelectingAll(false);
    }
  };

  const confirmDeleteOne = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/products/${deleteTarget._id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Product deleted");
      setDeleteTarget(null);
      fetchList();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  const bulkDelete = async () => {
    if (!hasSelection) return;
    if (!window.confirm(`Delete ${selectedIds.size} product(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const ids = [...selectedIds];
      for (const id of ids) {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE", credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      }
      toast.success("Selected products deleted");
      setSelectedIds(new Set());
      fetchList();
    } catch (e) {
      toast.error(e.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const statCards = useMemo(
    () => [
      { label: "Total Products", value: stats.total },
      { label: "Active", value: stats.active },
      { label: "Draft", value: stats.draft },
      { label: "Low Stock", value: stats.lowStock },
    ],
    [stats]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Products</h2>
          <p className="text-sm text-[#6b7280]">
            Manage catalog products, pricing, inventory, and CSV bulk import/export.
          </p>
        </div>
        <Link
          href="/catalog/products/new"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-medium text-white hover:bg-[#185f9e]"
        >
          Add Product
        </Link>
      </div>

      <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1e3a8a]">CSV Import / Export</p>
            <p className="text-xs text-[#64748b]">
              Download a template, export all products, or import a CSV to create/update products (including SEO).
            </p>
          </div>
          <CsvImportExportBar endpoint="/api/products/csv" label="Products" onImported={fetchList} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#111827]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, article…"
          className="h-10 w-full max-w-md rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] lg:w-44"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] lg:w-56"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-[#6b7280] lg:ml-auto">
          {total} {total === 1 ? "product" : "products"}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
        </p>
      </div>

      {canSelectAllMatching && !hasSelection ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
          <p className="text-sm text-[#1e3a8a]">
            Tip: check products on this page, or select all matching results (up to 200).
          </p>
          <button
            type="button"
            disabled={selectingAll || loading}
            onClick={selectAllMatching}
            className="rounded-lg border border-[#1d6fb8] bg-white px-4 py-2 text-sm font-medium text-[#1d6fb8] hover:bg-white/80 disabled:opacity-60"
          >
            {selectingAll ? "Selecting…" : `Select all ${Math.min(total, 200)} matching`}
          </button>
        </div>
      ) : null}

      {hasSelection ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-red-900">{selectedIds.size} selected</p>
            {total > selectedIds.size ? (
              <button
                type="button"
                disabled={selectingAll || bulkDeleting}
                onClick={selectAllMatching}
                className="text-sm font-medium text-[#1d6fb8] hover:underline disabled:opacity-60"
              >
                {selectingAll ? "Selecting…" : `Select all ${Math.min(total, 200)} matching`}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => setBulkSpreadsheetOpen(true)}
              className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-medium text-white hover:bg-[#185f9e] disabled:opacity-60"
            >
              Bulk edit
            </button>
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => setBulkAddOnsOpen(true)}
              className="rounded-lg border border-[#1d6fb8] bg-white px-4 py-2 text-sm font-medium text-[#1d6fb8] hover:bg-[#eff6ff] disabled:opacity-60"
            >
              Quick add-ons
            </button>
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={bulkDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {bulkDeleting ? "Deleting…" : "Delete Selected"}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-6 py-16 text-center shadow-sm">
          <EmptyIllustration />
          <h3 className="mt-4 text-lg font-semibold text-[#111827]">No car accessories yet.</h3>
          <p className="mt-2 text-sm text-[#6b7280]">Add your first car accessory product.</p>
          <Link
            href="/catalog/products/new"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#1d6fb8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#185f9e]"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <ProductsTable
          rows={rows}
          loading={loading}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onDeleteRow={(row) => setDeleteTarget(row)}
          onRefresh={fetchList}
        />
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#e5e7eb] pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40"
          >
            First
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40"
          >
            Previous
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={page === n ? "page" : undefined}
                className={[
                  "min-w-9 rounded-lg border px-3 py-2 text-sm font-medium",
                  page === n
                    ? "border-[#1d6fb8] bg-[#1d6fb8] text-white"
                    : "border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40"
          >
            Last
          </button>
        </div>
      ) : null}

      {bulkAddOnsOpen ? (
        <ProductBulkAddOnsModal
          selectedCount={selectedIds.size}
          selectedIds={[...selectedIds]}
          onClose={() => setBulkAddOnsOpen(false)}
          onSaved={() => {
            setSelectedIds(new Set());
            fetchList();
          }}
        />
      ) : null}

      {bulkSpreadsheetOpen ? (
        <ProductBulkSpreadsheet
          selectedIds={[...selectedIds]}
          onClose={() => setBulkSpreadsheetOpen(false)}
          onSaved={() => {
            setSelectedIds(new Set());
            fetchList();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111827]">Delete product?</h3>
            <p className="mt-2 text-sm text-[#6b7280]">{deleteTarget.name}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOne}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
