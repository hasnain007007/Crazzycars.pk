/**
 * Modal to view / add / remove products for a Car Catalog model.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";

function thumbUrl(p) {
  const imgs = p.media?.images || [];
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || null;
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return { bg: "#dcfce7", color: "#166534", label: "Active" };
  if (s === "draft") return { bg: "#f3f4f6", color: "#4b5563", label: "Draft" };
  return { bg: "#fee2e2", color: "#991b1b", label: status || "—" };
}

export function ModelProductsPanel({ makeId, modelId, makeName, modelName, onClose }) {
  const [products, setProducts] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [listSelectedIds, setListSelectedIds] = useState(() => new Set());
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const pickerTimer = useRef(null);

  const apiBase = `/api/car-catalog/${makeId}/models/${modelId}/products`;

  const loadProducts = useCallback(
    async (pageNum = 1, search = listSearch) => {
      if (!makeId || !modelId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`${apiBase}?${params}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load products");
        setProducts(json.products || json.data || []);
        setTotal(json.total || 0);
        setPage(json.page || 1);
        setTotalPages(json.totalPages || 1);
        setVehicle(json.vehicle || null);
        setListSelectedIds(new Set());
      } catch (err) {
        toast.error(err.message || "Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBase, listSearch, makeId, modelId]
  );

  useEffect(() => {
    loadProducts(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeId, modelId]);

  const searchPicker = useCallback(
    async (q) => {
      const query = q.trim();
      if (query.length < 1) {
        setPickerResults([]);
        return;
      }
      setPickerLoading(true);
      try {
        const params = new URLSearchParams({ search: query, limit: "50", page: "1" });
        const res = await fetch(`/api/products?${params}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Search failed");
        const already = new Set(products.map((p) => String(p._id)));
        setPickerResults((json.data || []).filter((p) => !already.has(String(p._id))));
        setSelectedIds(new Set());
      } catch (err) {
        toast.error(err.message || "Search failed");
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    },
    [products]
  );

  useEffect(() => {
    if (!pickerOpen) return;
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
    pickerTimer.current = setTimeout(() => searchPicker(pickerQuery), 280);
    return () => {
      if (pickerTimer.current) clearTimeout(pickerTimer.current);
    };
  }, [pickerQuery, pickerOpen, searchPicker]);

  const allPickerSelected =
    pickerResults.length > 0 && pickerResults.every((p) => selectedIds.has(String(p._id)));
  const selectedCount = useMemo(
    () => pickerResults.filter((p) => selectedIds.has(String(p._id))).length,
    [pickerResults, selectedIds]
  );

  const allListSelected =
    products.length > 0 && products.every((p) => listSelectedIds.has(String(p._id)));
  const listSelectedCount = useMemo(
    () => products.filter((p) => listSelectedIds.has(String(p._id))).length,
    [products, listSelectedIds]
  );

  const toggleSelected = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPickerSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pickerResults.map((p) => String(p._id))));
  };

  const toggleListSelected = (id) => {
    const sid = String(id);
    setListSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const toggleListSelectAll = () => {
    if (allListSelected) setListSelectedIds(new Set());
    else setListSelectedIds(new Set(products.map((p) => String(p._id))));
  };

  const addSelectedProducts = async () => {
    const ids = pickerResults.map((p) => String(p._id)).filter((id) => selectedIds.has(id));
    if (!ids.length) {
      toast.error("Select at least one product");
      return;
    }
    setBulkAdding(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productIds: ids }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Add failed");
      toast.success(`Added ${ids.length} product${ids.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
      setPickerResults((rows) => rows.filter((r) => !ids.includes(String(r._id))));
      await loadProducts(page, listSearch);
    } catch (err) {
      toast.error(err.message || "Could not add products");
    } finally {
      setBulkAdding(false);
    }
  };

  const addProduct = async (product) => {
    const id = String(product._id);
    setBusyId(id);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Add failed");
      toast.success(`Added “${product.name}”`);
      setPickerResults((rows) => rows.filter((r) => String(r._id) !== id));
      await loadProducts(page, listSearch);
    } catch (err) {
      toast.error(err.message || "Could not add product");
    } finally {
      setBusyId(null);
    }
  };

  const removeProduct = async (product) => {
    const id = String(product._id);
    if (!window.confirm(`Remove “${product.name}” from ${makeName} ${modelName}?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Remove failed");
      toast.success("Removed from this car");
      await loadProducts(page, listSearch);
    } catch (err) {
      toast.error(err.message || "Could not remove product");
    } finally {
      setBusyId(null);
    }
  };

  const removeSelectedProducts = async () => {
    const ids = products.map((p) => String(p._id)).filter((id) => listSelectedIds.has(id));
    if (!ids.length) {
      toast.error("Select at least one product");
      return;
    }
    if (
      !window.confirm(
        `Remove ${ids.length} product${ids.length === 1 ? "" : "s"} from ${makeName} ${modelName}?`
      )
    ) {
      return;
    }
    setBulkRemoving(true);
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productIds: ids }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Remove failed");
      toast.success(`Removed ${json.removed || ids.length} product${ids.length === 1 ? "" : "s"}`);
      setListSelectedIds(new Set());
      await loadProducts(page, listSearch);
    } catch (err) {
      toast.error(err.message || "Could not remove products");
    } finally {
      setBulkRemoving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Products for ${makeName} ${modelName}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              Products · {makeName} {modelName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {total} product{total === 1 ? "" : "s"} linked
              {vehicle?.slug ? (
                <>
                  {" · "}
                  <a
                    href={`${process.env.NEXT_PUBLIC_STORE_URL || "https://storecraft-store-iota.vercel.app"}/cars/${vehicle.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#C41E1E] hover:underline"
                  >
                    /cars/{vehicle.slug}
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPickerOpen((o) => !o);
                setPickerQuery("");
                setPickerResults([]);
                setSelectedIds(new Set());
              }}
              className="rounded-lg bg-[#009688] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {pickerOpen ? "Close search" : "+ Add product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pickerOpen ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search products to add
              </label>
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="Search by name, article no, or SKU…"
                style={inputStyle}
                autoFocus
              />
              <div className="mt-2 max-h-56 overflow-y-auto">
                {pickerLoading ? (
                  <p className="text-xs text-slate-500">Searching…</p>
                ) : pickerQuery.trim() && !pickerResults.length ? (
                  <p className="text-xs text-slate-500">No matching products (or already linked).</p>
                ) : pickerResults.length ? (
                  <>
                    <div className="sticky top-0 z-[1] mb-1 flex items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 py-1.5">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={allPickerSelected}
                          onChange={toggleSelectAll}
                          className="accent-[#009688]"
                        />
                        Select all ({pickerResults.length})
                      </label>
                      <button
                        type="button"
                        disabled={!selectedCount || bulkAdding}
                        onClick={addSelectedProducts}
                        className="rounded-md bg-[#009688] px-2.5 py-1 text-xs font-bold text-white disabled:bg-slate-400"
                      >
                        {bulkAdding
                          ? "Adding…"
                          : selectedCount
                            ? `Add selected (${selectedCount})`
                            : "Add selected"}
                      </button>
                    </div>
                    {pickerResults.map((p) => {
                      const thumb = thumbUrl(p);
                      const id = String(p._id);
                      const checked = selectedIds.has(id);
                      const busy = busyId === id || bulkAdding;
                      return (
                        <div
                          key={p._id}
                          className={`flex items-center gap-2 border-b border-slate-100 py-2 ${checked ? "bg-emerald-100/50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() => toggleSelected(id)}
                            className="accent-[#009688]"
                          />
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-slate-100">
                            {thumb ? (
                              <Image src={thumb} alt="" fill sizes="36px" className="object-cover" unoptimized />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {p.articleNo || p.inventory?.sku || p.slug} ·{" "}
                              {formatAdminPrice(Number(p.pricing?.regularPrice) || 0)}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => addProduct(p)}
                            className="rounded border border-[#009688] px-2 py-0.5 text-[11px] font-semibold text-[#009688] disabled:opacity-50"
                          >
                            {busyId === id ? "…" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  loadProducts(1, listSearch);
                }
              }}
              placeholder="Filter linked products…"
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            />
            <button
              type="button"
              onClick={() => loadProducts(1, listSearch)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
            >
              Search
            </button>
            {products.length ? (
              <>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allListSelected}
                    onChange={toggleListSelectAll}
                    className="accent-[#C41E1E]"
                  />
                  Select all
                </label>
                <button
                  type="button"
                  disabled={!listSelectedCount || bulkRemoving}
                  onClick={removeSelectedProducts}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
                >
                  {bulkRemoving
                    ? "Removing…"
                    : listSelectedCount
                      ? `Remove selected (${listSelectedCount})`
                      : "Remove selected"}
                </button>
              </>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading products…</p>
          ) : !products.length ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No products linked to this car yet. Use “+ Add product”.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="w-8 px-1.5 py-2">
                      <input
                        type="checkbox"
                        checked={allListSelected}
                        onChange={toggleListSelectAll}
                        className="accent-[#C41E1E]"
                        aria-label="Select all products"
                      />
                    </th>
                    <th className="px-1.5 py-2 font-semibold">Product</th>
                    <th className="px-1.5 py-2 font-semibold">Status</th>
                    <th className="px-1.5 py-2 font-semibold">Price</th>
                    <th className="px-1.5 py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const thumb = thumbUrl(p);
                    const badge = statusBadge(p.status);
                    const id = String(p._id);
                    const checked = listSelectedIds.has(id);
                    const busy = busyId === id || bulkRemoving;
                    return (
                      <tr
                        key={p._id}
                        className={`border-b border-slate-100 ${checked ? "bg-red-50/40" : ""}`}
                      >
                        <td className="px-1.5 py-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() => toggleListSelected(id)}
                            className="accent-[#C41E1E]"
                            aria-label={`Select ${p.name}`}
                          />
                        </td>
                        <td className="px-1.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                              {thumb ? (
                                <Image src={thumb} alt="" fill sizes="40px" className="object-cover" unoptimized />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/catalog/products/${p._id}`}
                                className="font-semibold text-slate-900 no-underline hover:text-[#C41E1E]"
                              >
                                {p.name}
                              </Link>
                              <p className="text-[11px] text-slate-400">
                                {p.articleNo || p.inventory?.sku || p.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 font-medium">
                          {formatAdminPrice(Number(p.pricing?.regularPrice) || 0)}
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-2.5 text-right">
                          <Link
                            href={`/catalog/products/${p._id}`}
                            className="mr-2 text-xs font-semibold text-blue-700 no-underline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeProduct(p)}
                            className="rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => loadProducts(page - 1, listSearch)}
                className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <span className="self-center text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => loadProducts(page + 1, listSearch)}
                className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
