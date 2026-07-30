/**
 * Bulk edit product add-ons for selected rows.
 */
"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const DEFAULT_ADDONS = [
  { name: "Spoiler paint", price: 1500, required: false },
  { name: "Wrap", price: 1000, required: false },
];

const MODES = [
  {
    id: "replace",
    label: "Replace all add-ons",
    hint: "Overwrite existing add-ons with the list below.",
  },
  {
    id: "merge",
    label: "Merge by name",
    hint: "Update matching names / add new ones; keep other add-ons.",
  },
  {
    id: "remove",
    label: "Remove listed add-ons",
    hint: "Delete add-ons that match the names below (price ignored).",
  },
  {
    id: "clear",
    label: "Clear all add-ons",
    hint: "Remove every add-on from the selected products.",
  },
];

export function ProductBulkAddOnsModal({ selectedCount, selectedIds, onClose, onSaved }) {
  const [rows, setRows] = useState(() => DEFAULT_ADDONS.map((a) => ({ ...a })));
  const [mode, setMode] = useState("replace");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => rows.filter((r) => String(r.name || "").trim()),
    [rows]
  );
  const showTable = mode !== "clear";
  const showPriceCols = mode === "replace" || mode === "merge";

  async function save() {
    if (mode !== "clear" && !preview.length) {
      toast.error(
        mode === "remove"
          ? "Enter at least one add-on name to remove."
          : "Add at least one add-on with a name."
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setAddOns",
          ids: selectedIds,
          mode,
          addOns:
            mode === "clear"
              ? []
              : preview.map((r) => ({
                  name: String(r.name).trim(),
                  price: Number(r.price) || 0,
                  required: Boolean(r.required),
                })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Bulk update failed");
      const count = json.modified ?? selectedCount;
      const verb =
        mode === "clear" || mode === "remove" ? "Removed add-ons from" : "Updated add-ons on";
      toast.success(`${verb} ${count} product${count === 1 ? "" : "s"}`);
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Bulk update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#111827]">Bulk edit add-ons</h3>
        <p className="mt-1 text-sm text-[#6b7280]">
          Apply to <span className="font-semibold text-[#111827]">{selectedCount}</span> selected
          product{selectedCount === 1 ? "" : "s"}.
        </p>

        <div className="mt-4 space-y-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className="flex items-start gap-2 rounded-lg border border-[#e5e7eb] p-3 text-sm"
            >
              <input
                type="radio"
                name="addon-mode"
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-[#111827]">{m.label}</span>
                <span className="mt-0.5 block text-xs text-[#6b7280]">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {showTable ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                    <th className="pb-2 pr-2 font-medium">Name</th>
                    {showPriceCols ? (
                      <>
                        <th className="pb-2 pr-2 font-medium">Price (Rs.)</th>
                        <th className="pb-2 pr-2 font-medium">Required</th>
                      </>
                    ) : null}
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[#f3f4f6]">
                      <td className="py-2 pr-2">
                        <input
                          value={row.name}
                          onChange={(e) => {
                            const next = [...rows];
                            next[i] = { ...row, name: e.target.value };
                            setRows(next);
                          }}
                          className="h-9 w-full rounded-lg border border-[#e5e7eb] px-2 text-sm outline-none ring-[#1d6fb8]/25 focus:ring-2"
                          placeholder="Add-on name"
                        />
                      </td>
                      {showPriceCols ? (
                        <>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={row.price}
                              onChange={(e) => {
                                const next = [...rows];
                                next[i] = { ...row, price: Number(e.target.value) };
                                setRows(next);
                              }}
                              className="h-9 w-full rounded-lg border border-[#e5e7eb] px-2 text-sm outline-none ring-[#1d6fb8]/25 focus:ring-2"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={Boolean(row.required)}
                              onChange={(e) => {
                                const next = [...rows];
                                next[i] = { ...row, required: e.target.checked };
                                setRows(next);
                              }}
                              className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                            />
                          </td>
                        </>
                      ) : null}
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className="text-lg leading-none text-red-500 hover:text-red-700"
                          onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, { name: "", price: 0, required: false }])}
              className="mt-3 text-sm font-medium text-[#1d6fb8] hover:underline"
            >
              + Add another
            </button>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            This will remove all add-ons from the {selectedCount} selected product
            {selectedCount === 1 ? "" : "s"}.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
              mode === "clear" || mode === "remove"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1d6fb8] hover:bg-[#185f9e]",
            ].join(" ")}
          >
            {saving
              ? "Saving…"
              : mode === "clear"
                ? `Clear on ${selectedCount}`
                : mode === "remove"
                  ? `Remove from ${selectedCount}`
                  : `Apply to ${selectedCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
