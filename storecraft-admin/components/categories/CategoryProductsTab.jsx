/**
 * Category editor Products tab — view, add, and remove products in this category.
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

export function CategoryProductsTab({ categoryId }) {
  const [products, setProducts] = useState([]);
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
  const [bulkAdding, setBulkAdding] = useState(false);
  const pickerTimer = useRef(null);

  const loadProducts = useCallback(
    async (pageNum = 1, search = listSearch) => {
      if (!categoryId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/categories/${categoryId}/products?${params}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load products");
        setProducts(json.products || json.data || []);
        setTotal(json.total || 0);
        setPage(json.page || 1);
        setTotalPages(json.totalPages || 1);
      } catch (err) {
        toast.error(err.message || "Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [categoryId, listSearch]
  );

  useEffect(() => {
    loadProducts(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

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
        const inCategory = new Set(products.map((p) => String(p._id)));
        const rows = (json.data || []).filter((p) => {
          if (inCategory.has(String(p._id))) return false;
          const cats = p.categories || [];
          return !cats.some((c) => String(c?._id || c) === String(categoryId));
        });
        setPickerResults(rows);
        setSelectedIds(new Set());
      } catch (err) {
        toast.error(err.message || "Search failed");
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    },
    [categoryId, products]
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
  const selectedCount = useMemo(() => {
    return pickerResults.filter((p) => selectedIds.has(String(p._id))).length;
  }, [pickerResults, selectedIds]);

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
    if (allPickerSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pickerResults.map((p) => String(p._id))));
  };

  const addSelectedProducts = async () => {
    const ids = pickerResults.map((p) => String(p._id)).filter((id) => selectedIds.has(id));
    if (!ids.length) {
      toast.error("Select at least one product");
      return;
    }
    setBulkAdding(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/products`, {
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
      const res = await fetch(`/api/categories/${categoryId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Add failed");
      toast.success(`Added “${product.name}”`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
    if (!window.confirm(`Remove “${product.name}” from this category?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/categories/${categoryId}/products?productId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Remove failed");
      toast.success("Removed from category");
      await loadProducts(page, listSearch);
    } catch (err) {
      toast.error(err.message || "Could not remove product");
    } finally {
      setBusyId(null);
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
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>Products in this category</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
            {total} product{total === 1 ? "" : "s"} assigned
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPickerOpen((o) => !o);
            setPickerQuery("");
            setPickerResults([]);
            setSelectedIds(new Set());
          }}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            background: "#009688",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {pickerOpen ? "Close search" : "+ Add product"}
        </button>
      </div>

      {pickerOpen ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #d1fae5",
            borderRadius: 10,
            background: "#f0fdf4",
          }}
        >
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
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
          <div style={{ marginTop: 10, maxHeight: 280, overflowY: "auto" }}>
            {pickerLoading ? (
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Searching…</p>
            ) : pickerQuery.trim() && !pickerResults.length ? (
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>No matching products (or already in this category).</p>
            ) : pickerResults.length ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "6px 0 10px",
                    borderBottom: "1px solid #bbf7d0",
                    marginBottom: 4,
                    position: "sticky",
                    top: 0,
                    background: "#f0fdf4",
                    zIndex: 1,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={allPickerSelected}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16, accentColor: "#009688" }}
                    />
                    Select all ({pickerResults.length})
                  </label>
                  <button
                    type="button"
                    disabled={!selectedCount || bulkAdding}
                    onClick={addSelectedProducts}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      background: selectedCount ? "#009688" : "#9ca3af",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: !selectedCount || bulkAdding ? "not-allowed" : "pointer",
                      opacity: bulkAdding ? 0.7 : 1,
                    }}
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid #e5e7eb",
                        background: checked ? "#ecfdf5" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={busy}
                        onChange={() => toggleSelected(id)}
                        style={{ width: 16, height: 16, accentColor: "#009688", flexShrink: 0 }}
                      />
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          overflow: "hidden",
                          background: "#f3f4f6",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        {thumb ? (
                          <Image src={thumb} alt="" fill sizes="40px" style={{ objectFit: "cover" }} unoptimized />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>
                          {p.articleNo || p.inventory?.sku || p.slug}
                          {" · "}
                          {formatAdminPrice(Number(p.pricing?.regularPrice) || 0)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addProduct(p)}
                        style={{
                          border: "1px solid #009688",
                          borderRadius: 6,
                          padding: "5px 10px",
                          background: "#fff",
                          color: "#009688",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: busy ? "wait" : "pointer",
                          opacity: busy ? 0.6 : 1,
                        }}
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

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              loadProducts(1, listSearch);
            }
          }}
          placeholder="Filter products in this category…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => loadProducts(1, listSearch)}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "0 14px",
            background: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>Loading products…</p>
      ) : !products.length ? (
        <div
          style={{
            padding: "28px 16px",
            textAlign: "center",
            border: "1px dashed #e5e7eb",
            borderRadius: 10,
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          No products in this category yet. Use “+ Add product” to assign some.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
                <th style={{ padding: "8px 6px", fontWeight: 600 }}>Product</th>
                <th style={{ padding: "8px 6px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "8px 6px", fontWeight: 600 }}>Price</th>
                <th style={{ padding: "8px 6px", fontWeight: 600 }}>Stock</th>
                <th style={{ padding: "8px 6px", fontWeight: 600 }} />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const thumb = thumbUrl(p);
                const badge = statusBadge(p.status);
                const busy = busyId === String(p._id);
                const qty = Number(p.inventory?.quantity);
                return (
                  <tr key={p._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            overflow: "hidden",
                            background: "#f3f4f6",
                            flexShrink: 0,
                            position: "relative",
                          }}
                        >
                          {thumb ? (
                            <Image src={thumb} alt="" fill sizes="40px" style={{ objectFit: "cover" }} unoptimized />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Link
                            href={`/catalog/products/${p._id}`}
                            style={{ color: "#111827", fontWeight: 600, textDecoration: "none" }}
                          >
                            {p.name}
                          </Link>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
                            {p.articleNo || p.inventory?.sku || p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: badge.bg,
                          color: badge.color,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 6px", fontWeight: 500 }}>
                      {formatAdminPrice(Number(p.pricing?.regularPrice) || 0)}
                    </td>
                    <td style={{ padding: "10px 6px", color: "#374151" }}>
                      {p.inventory?.trackInventory === false ? "—" : Number.isFinite(qty) ? qty : "—"}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        href={`/catalog/products/${p._id}`}
                        style={{
                          marginRight: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1d4ed8",
                          textDecoration: "none",
                        }}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeProduct(p)}
                        style={{
                          border: "1px solid #fecaca",
                          borderRadius: 6,
                          padding: "4px 8px",
                          background: "#fff",
                          color: "#dc2626",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: busy ? "wait" : "pointer",
                          opacity: busy ? 0.6 : 1,
                        }}
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
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => loadProducts(page - 1, listSearch)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "6px 12px",
              background: "#fff",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <span style={{ alignSelf: "center", fontSize: 12, color: "#6b7280" }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => loadProducts(page + 1, listSearch)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "6px 12px",
              background: "#fff",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
