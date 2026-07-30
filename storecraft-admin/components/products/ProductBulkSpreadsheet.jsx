/**
 * Shopify-style spreadsheet bulk editor for products + nested add-ons.
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const DEFAULT_ADDONS = [
  { name: "Spoiler paint", price: 1500, required: false },
  { name: "Wrap", price: 1000, required: false },
];

function thumbUrl(p) {
  const imgs = p.media?.images || [];
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || null;
}

function cloneRows(list) {
  return (list || []).map((r) => ({
    ...r,
    pricing: { ...(r.pricing || {}) },
    inventory: { ...(r.inventory || {}) },
    addOns: (r.addOns || []).map((a) => ({ ...a })),
    _expanded: Boolean(r._expanded),
    _selected: r._selected !== false,
  }));
}

function cellClass() {
  return "h-9 w-full min-w-[88px] rounded border border-transparent bg-transparent px-2 text-sm text-[#111827] outline-none hover:border-[#d1d5db] focus:border-[#1d6fb8] focus:bg-white focus:ring-1 focus:ring-[#1d6fb8]/30";
}

export function ProductBulkSpreadsheet({ selectedIds, onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetchByIds", ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load products");
      setRows(
        cloneRows(
          (json.data || []).map((r) => ({
            ...r,
            _expanded: true,
            _selected: true,
          }))
        )
      );
      setDirty(false);
    } catch (e) {
      toast.error(e.message || "Failed to load");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [selectedIds, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCount = useMemo(() => rows.filter((r) => r._selected).length, [rows]);
  const allSelected = rows.length > 0 && rows.every((r) => r._selected);

  function markDirty(updater) {
    setDirty(true);
    setRows(updater);
  }

  function updateRow(id, patch) {
    markDirty((prev) =>
      prev.map((r) => (String(r._id) === String(id) ? { ...r, ...patch } : r))
    );
  }

  function updateAddOn(productId, index, patch) {
    markDirty((prev) =>
      prev.map((r) => {
        if (String(r._id) !== String(productId)) return r;
        const addOns = [...(r.addOns || [])];
        addOns[index] = { ...addOns[index], ...patch };
        return { ...r, addOns };
      })
    );
  }

  function removeAddOn(productId, index) {
    markDirty((prev) =>
      prev.map((r) => {
        if (String(r._id) !== String(productId)) return r;
        return { ...r, addOns: (r.addOns || []).filter((_, i) => i !== index) };
      })
    );
  }

  function addAddOn(productId, seed = { name: "", price: 0, required: false }) {
    markDirty((prev) =>
      prev.map((r) => {
        if (String(r._id) !== String(productId)) return r;
        return {
          ...r,
          _expanded: true,
          addOns: [...(r.addOns || []), { ...seed }],
        };
      })
    );
  }

  function toggleSelectAll() {
    const next = !allSelected;
    setRows((prev) => prev.map((r) => ({ ...r, _selected: next })));
  }

  function applyDefaultsToSelected() {
    if (!selectedCount) {
      toast.error("Select at least one product in this grid.");
      return;
    }
    markDirty((prev) =>
      prev.map((r) => {
        if (!r._selected) return r;
        let addOns = [...(r.addOns || [])];
        for (const def of DEFAULT_ADDONS) {
          const key = def.name.toLowerCase();
          const idx = addOns.findIndex((a) => String(a.name || "").trim().toLowerCase() === key);
          if (idx >= 0) {
            addOns[idx] = { ...addOns[idx], name: def.name, price: def.price };
          } else {
            addOns.push({ ...def });
          }
        }
        return { ...r, addOns, _expanded: true };
      })
    );
    toast.success(`Applied Spoiler paint + Wrap to ${selectedCount} product(s)`);
  }

  function clearAddOnsOnSelected() {
    if (!selectedCount) {
      toast.error("Select at least one product in this grid.");
      return;
    }
    if (!window.confirm(`Clear all add-ons on ${selectedCount} selected product(s)?`)) return;
    markDirty((prev) =>
      prev.map((r) => (r._selected ? { ...r, addOns: [], _expanded: true } : r))
    );
  }

  function setCodOnSelected(enabled) {
    if (!selectedCount) {
      toast.error("Select at least one product in this grid.");
      return;
    }
    markDirty((prev) => prev.map((r) => (r._selected ? { ...r, codEnabled: enabled } : r)));
    toast.success(
      enabled
        ? `COD enabled on ${selectedCount} product(s)`
        : `COD disabled on ${selectedCount} product(s)`
    );
  }

  function setAdvancePercentOnSelected(percent) {
    if (!selectedCount) {
      toast.error("Select at least one product in this grid.");
      return;
    }
    const pct = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
    markDirty((prev) =>
      prev.map((r) => (r._selected ? { ...r, advancePercentRequired: pct } : r))
    );
    toast.success(
      pct > 0
        ? `Set ${pct}% advance on ${selectedCount} product(s)`
        : `Cleared advance requirement on ${selectedCount} product(s)`
    );
  }

  async function save() {
    const targets = rows.filter((r) => r._selected);
    if (!targets.length) {
      toast.error("Select at least one product to save.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveRows",
          rows: targets.map((r) => ({
            id: r._id,
            status: r.status,
            featured: Boolean(r.featured),
            codEnabled: r.codEnabled !== false,
            advancePercentRequired: Math.min(
              100,
              Math.max(0, Number(r.advancePercentRequired) || 0)
            ),
            regularPrice: Number(r.pricing?.regularPrice) || 0,
            quantity: Number(r.inventory?.quantity) || 0,
            addOns: (r.addOns || [])
              .filter((a) => String(a.name || "").trim())
              .map((a) => ({
                name: String(a.name).trim(),
                price: Number(a.price) || 0,
                required: Boolean(a.required),
              })),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success(`Saved ${json.modified ?? targets.length} product(s)`);
      setDirty(false);
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f6f6f7]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Editing {rows.length} product{rows.length === 1 ? "" : "s"}
            </h2>
            <p className="text-xs text-[#6b7280]">
              Inline edit status, price, stock, featured, and add-ons — then Save.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdvancePercentOnSelected(50)}
            disabled={loading || saving}
            className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-60"
          >
            Set 50% advance
          </button>
          <button
            type="button"
            onClick={() => setAdvancePercentOnSelected(0)}
            disabled={loading || saving}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            Clear advance
          </button>
          <button
            type="button"
            onClick={() => setCodOnSelected(true)}
            disabled={loading || saving}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            Enable COD
          </button>
          <button
            type="button"
            onClick={() => setCodOnSelected(false)}
            disabled={loading || saving}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60"
          >
            Disable COD
          </button>
          <button
            type="button"
            onClick={applyDefaultsToSelected}
            disabled={loading || saving}
            className="rounded-lg border border-[#1d6fb8] bg-white px-3 py-2 text-sm font-medium text-[#1d6fb8] hover:bg-[#eff6ff] disabled:opacity-60"
          >
            Set Spoiler paint + Wrap
          </button>
          <button
            type="button"
            onClick={clearAddOnsOnSelected}
            disabled={loading || saving}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Clear add-ons
          </button>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || !dirty}
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9e] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {loading ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white px-6 py-16 text-center text-sm text-[#6b7280]">
            Loading products…
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                        aria-label="Select all products in editor"
                      />
                    </th>
                    <th className="min-w-[280px] px-3 py-3">Product title</th>
                    <th className="min-w-[120px] px-2 py-3">Status</th>
                    <th className="min-w-[120px] px-2 py-3">Base price</th>
                    <th className="min-w-[100px] px-2 py-3">Stock</th>
                    <th className="min-w-[90px] px-2 py-3">Featured</th>
                    <th className="min-w-[90px] px-2 py-3">COD</th>
                    <th className="min-w-[130px] px-2 py-3">Advance %</th>
                    <th className="min-w-[280px] px-2 py-3">Add-ons</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const thumb = thumbUrl(row);
                    const addOns = row.addOns || [];
                    return (
                      <tr key={row._id} className="group border-b border-[#f3f4f6] align-top hover:bg-[#fafafa]">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(row._selected)}
                            onChange={(e) => updateRow(row._id, { _selected: e.target.checked })}
                            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-[#e5e7eb] bg-[#f3f4f6]">
                              {thumb ? (
                                <Image src={thumb} alt="" fill className="object-cover" sizes="40px" unoptimized />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#111827]">{row.name}</p>
                              <p className="mt-0.5 text-xs text-[#6b7280]">
                                {row.articleNo || "—"}
                                {row.categories?.[0]?.name ? ` · ${row.categories[0].name}` : ""}
                              </p>
                              <button
                                type="button"
                                onClick={() => updateRow(row._id, { _expanded: !row._expanded })}
                                className="mt-1 text-xs font-medium text-[#1d6fb8] hover:underline"
                              >
                                {row._expanded ? "Hide add-ons" : `Show add-ons (${addOns.length})`}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <select
                            value={row.status || "draft"}
                            onChange={(e) => updateRow(row._id, { status: e.target.value })}
                            className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-[#1d6fb8]/25"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="draft">Draft</option>
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#9ca3af]">Rs</span>
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={row.pricing?.regularPrice ?? 0}
                              onChange={(e) =>
                                updateRow(row._id, {
                                  pricing: {
                                    ...row.pricing,
                                    regularPrice: Number(e.target.value),
                                  },
                                })
                              }
                              className={cellClass()}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={row.inventory?.quantity ?? 0}
                            onChange={(e) =>
                              updateRow(row._id, {
                                inventory: {
                                  ...row.inventory,
                                  quantity: Number(e.target.value),
                                },
                              })
                            }
                            className={cellClass()}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(row.featured)}
                            onChange={(e) => updateRow(row._id, { featured: e.target.checked })}
                            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <label className="inline-flex items-center gap-1.5 text-xs text-[#374151]">
                            <input
                              type="checkbox"
                              checked={row.codEnabled !== false}
                              onChange={(e) => updateRow(row._id, { codEnabled: e.target.checked })}
                              className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                            />
                            {row.codEnabled !== false ? "On" : "Off"}
                          </label>
                        </td>
                        <td className="px-2 py-3">
                          <select
                            value={String(row.advancePercentRequired || 0)}
                            onChange={(e) =>
                              updateRow(row._id, {
                                advancePercentRequired: Number(e.target.value) || 0,
                              })
                            }
                            className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-[#1d6fb8]/25"
                          >
                            <option value="0">None</option>
                            <option value="25">25%</option>
                            <option value="50">50%</option>
                            <option value="75">75%</option>
                            <option value="100">100%</option>
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          {!row._expanded ? (
                            <p className="text-xs text-[#6b7280]">
                              {addOns.length
                                ? addOns.map((a) => `${a.name} (${a.price})`).join(", ")
                                : "No add-ons"}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {addOns.map((addon, i) => (
                                <div
                                  key={`${row._id}-addon-${i}`}
                                  className="flex flex-wrap items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-1.5"
                                >
                                  <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                                    Add-on
                                  </span>
                                  <input
                                    value={addon.name}
                                    onChange={(e) => updateAddOn(row._id, i, { name: e.target.value })}
                                    placeholder="Name"
                                    className="h-8 min-w-[120px] flex-1 rounded border border-[#e5e7eb] bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-[#1d6fb8]/30"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    value={addon.price}
                                    onChange={(e) =>
                                      updateAddOn(row._id, i, { price: Number(e.target.value) })
                                    }
                                    className="h-8 w-20 rounded border border-[#e5e7eb] bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-[#1d6fb8]/30"
                                    title="Price"
                                  />
                                  <label className="flex items-center gap-1 px-1 text-[11px] text-[#6b7280]">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(addon.required)}
                                      onChange={(e) =>
                                        updateAddOn(row._id, i, { required: e.target.checked })
                                      }
                                    />
                                    Req
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeAddOn(row._id, i)}
                                    className="px-1 text-sm text-red-500 hover:text-red-700"
                                    aria-label="Remove add-on"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => addAddOn(row._id)}
                                  className="text-xs font-medium text-[#1d6fb8] hover:underline"
                                >
                                  + Add add-on
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    markDirty((prev) =>
                                      prev.map((r) => {
                                        if (String(r._id) !== String(row._id)) return r;
                                        let addOns = [...(r.addOns || [])];
                                        for (const def of DEFAULT_ADDONS) {
                                          const key = def.name.toLowerCase();
                                          const idx = addOns.findIndex(
                                            (a) => String(a.name || "").trim().toLowerCase() === key
                                          );
                                          if (idx >= 0) {
                                            addOns[idx] = {
                                              ...addOns[idx],
                                              name: def.name,
                                              price: def.price,
                                            };
                                          } else {
                                            addOns.push({ ...def });
                                          }
                                        }
                                        return { ...r, addOns, _expanded: true };
                                      })
                                    );
                                  }}
                                  className="text-xs font-medium text-[#6b7280] hover:underline"
                                >
                                  + Spoiler paint & Wrap
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] bg-white px-4 py-2 text-xs text-[#6b7280]">
        <span>
          {selectedCount} of {rows.length} selected for save
          {dirty ? " · Unsaved changes" : ""}
        </span>
        <span>Max {selectedIds.length} · nested add-ons edit like Shopify variants</span>
      </footer>
    </div>
  );
}
