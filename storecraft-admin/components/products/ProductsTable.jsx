/**
 * Products admin table: selection, stock badges, featured toggle, actions.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { computeProductSaleState } from "@/lib/productSale";
import { getFitmentBadge } from "@/lib/vehicleCompatibility";
import { formatAdminPrice } from "@/lib/currency";
import { ProductQrCompact } from "./QRCodeGenerator";

function thumbUrl(p) {
  const imgs = p.media?.images || [];
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || null;
}

function StockCell({ row }) {
  const track = row.inventory?.trackInventory !== false;
  const q = Number(row.inventory?.quantity) ?? 0;
  const th = Number(row.inventory?.lowStockThreshold ?? 5);
  if (!track) {
    return <span className="text-[#9ca3af]">—</span>;
  }
  if (q === 0) {
    return <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Out of Stock</span>;
  }
  if (q > 0 && q <= th) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Low Stock</span>
        <span className="text-sm font-medium text-amber-700">{q}</span>
      </div>
    );
  }
  return <span className="text-sm font-semibold text-emerald-700">{q}</span>;
}

const storeBase =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : "https://crazzycars.pk";

export function ProductsTable({
  rows,
  loading,
  selectedIds,
  onSelectChange,
  onDeleteRow,
  onRefresh,
}) {
  const [busyFeatured, setBusyFeatured] = useState(null);
  const [qrRow, setQrRow] = useState(null);

  const allIds = useMemo(() => rows.map((r) => String(r._id)), [rows]);
  const allSelected = rows.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(allIds));
    }
  }, [allSelected, allIds, onSelectChange]);

  const toggleOne = useCallback(
    (id) => {
      const next = new Set(selectedIds);
      const sid = String(id);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      onSelectChange(next);
    },
    [selectedIds, onSelectChange]
  );

  const setFeatured = async (row, value) => {
    setBusyFeatured(String(row._id));
    try {
      const res = await fetch(`/api/products/${row._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featured: value }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
      onRefresh?.();
    } catch (e) {
      toast.error(e.message || "Update failed");
    } finally {
      setBusyFeatured(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-8 text-center text-sm text-[#6b7280]">
        Loading products…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                  aria-label="Select all on page"
                />
              </th>
              <th className="w-16 px-2 py-3 font-medium">Image</th>
              <th className="min-w-[200px] px-3 py-3 font-medium">Name &amp; Article</th>
              <th className="min-w-[100px] px-3 py-3 font-medium">Fitment</th>
              <th className="min-w-[140px] px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Featured</th>
              <th className="min-w-[120px] px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = String(row._id);
              const cats = row.categories || [];
              const catLabel = cats
                .map((c) => (typeof c === "object" && c?.name ? c.name : ""))
                .filter(Boolean)
                .join(", ");
              const reg = row.pricing?.regularPrice;
              const saleState = computeProductSaleState(row.pricing);
              const eff = saleState.effectiveSalePrice;
              const priceLabel =
                saleState.isOnSale && eff != null && Number(eff) < Number(reg) ? (
                  <span>
                    <span className="text-emerald-700">{formatAdminPrice(eff)}</span>
                    <span className="ml-1 text-xs text-[#9ca3af] line-through">{formatAdminPrice(reg || 0)}</span>
                  </span>
                ) : (
                  <span>{formatAdminPrice(reg || 0)}</span>
                );
              const img = thumbUrl(row);
              const fitBadge = getFitmentBadge(row);

              return (
                <tr key={id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => toggleOne(id)}
                      className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f3f4f6]">
                      {img ? (
                        <Image src={img} alt="" fill className="object-cover" unoptimized sizes="48px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[#9ca3af]">—</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-[#111827]">{row.name}</p>
                    <p className="text-xs text-[#6b7280]">{row.articleNo || "—"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${fitBadge.className}`}
                      title={fitBadge.label}
                    >
                      <span aria-hidden>{fitBadge.icon}</span>
                      {fitBadge.label}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-[#374151]">{catLabel || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{priceLabel}</td>
                  <td className="px-3 py-2">
                    <StockCell row={row} />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        row.status === "active"
                          ? "bg-emerald-50 text-emerald-800"
                          : row.status === "draft"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-50 text-amber-800",
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busyFeatured === id}
                      onClick={() => setFeatured(row, !row.featured)}
                      className={[
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        row.featured ? "bg-[#1d6fb8]" : "bg-[#e5e7eb]",
                        busyFeatured === id ? "opacity-60" : "",
                      ].join(" ")}
                      aria-pressed={Boolean(row.featured)}
                      aria-label="Toggle featured"
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block h-5 w-5 translate-x-0.5 transform rounded-full bg-white shadow ring-0 transition",
                          row.featured ? "translate-x-5" : "",
                        ].join(" ")}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.status === "active" ? (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-sm text-[#374151] hover:bg-[#f9fafb]"
                          title="QR code"
                          aria-label="Show QR code"
                          onClick={() => setQrRow(row)}
                        >
                          ▣
                        </button>
                      ) : null}
                      <Link
                        href={`/catalog/products/${id}`}
                        className="text-xs font-medium text-[#1d6fb8] hover:underline"
                      >
                        Edit
                      </Link>
                      <button type="button" className="text-xs font-medium text-red-600 hover:underline" onClick={() => onDeleteRow(row)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {qrRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setQrRow(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#111827]">Product QR</h3>
              <button type="button" className="text-[#6b7280] hover:text-[#111827]" onClick={() => setQrRow(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <ProductQrCompact productName={qrRow.name} productSlug={qrRow.slug} storeUrl={storeBase} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
