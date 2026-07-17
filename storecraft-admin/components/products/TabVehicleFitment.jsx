"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { buildCatalogFromMakes, yearsForModelFromCatalog } from "@/lib/carCatalogApi";
import { formatModelOptionLabel } from "@/lib/carCatalogDisplay";
import {
  BODY_STYLES,
  CAR_TYPE_OPTIONS,
  emptyVehicleCompatibility,
  normalizeVehicleCompatibility,
  vehiclesFromCsv,
  vehiclesToCsv,
} from "@/lib/vehicleCompatibility";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_MIN = 1990;
const YEAR_MAX = 2026;

const QUICK_ADD_PRESETS = [
  { label: "All Honda Civic", make: "Honda", model: "Civic" },
  { label: "All Toyota Corolla", make: "Toyota", model: "Corolla" },
  { label: "All Suzuki Alto", make: "Suzuki", model: "Alto" },
  { label: "All KIA Sportage", make: "KIA", model: "Sportage" },
  { label: "All Toyota Prado", make: "Toyota", model: "Prado" },
];

const fieldClass =
  "h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-2 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2";

function FitmentTypeCard({ active, icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-1 flex-col items-center rounded-xl border-2 p-4 text-center transition",
        active ? "border-[#1d6fb8] bg-[#eff6ff]" : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1]",
      ].join(" ")}
    >
      <span className="text-2xl">{icon}</span>
      <span className="mt-2 text-sm font-semibold text-[#111827]">{title}</span>
      <span className="mt-1 text-xs text-[#6b7280]">{description}</span>
    </button>
  );
}

function SearchableSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [options, q]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldClass} text-left ${disabled ? "opacity-50" : ""}`}
      >
        {value || placeholder}
      </button>
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-[#e5e7eb] px-2 py-1.5 text-sm outline-none"
          />
          <ul className="max-h-36 overflow-y-auto">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-[#f3f4f6]"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
            {!filtered.length ? (
              <li className="px-2 py-2 text-xs text-[#9ca3af]">No matches</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function TabVehicleFitment({ value, onChange }) {
  const vc = normalizeVehicleCompatibility(value || emptyVehicleCompatibility());
  const [catalog, setCatalog] = useState({ makes: [], carData: {} });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [previewRowId, setPreviewRowId] = useState(null);
  const csvRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/car-catalog", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.makes)) {
          const built = buildCatalogFromMakes(json.makes);
          setCatalog(built);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback(
    (partial) => {
      onChange(normalizeVehicleCompatibility({ ...vc, ...partial }));
    },
    [vc, onChange]
  );

  const makeOptions = useMemo(
    () => ["All Makes", ...(catalog.makes || [])],
    [catalog.makes]
  );

  const updateVehicle = (rowId, field, val) => {
    setPreviewRowId(rowId);
    const vehicles = vc.vehicles.map((row) => {
      if (row._rowId !== rowId) return row;
      const next = { ...row, [field]: val };
      if (field === "make" || field === "model") {
        const mk = field === "make" ? (val === "All Makes" ? "" : val) : next.make;
        const md = field === "model" ? (val === "All Models" ? "" : val) : next.model;
        const entry =
          mk && md
            ? catalog.carData[mk]?.find(
                (m) =>
                  m.model === md ||
                  m.nickname === md ||
                  formatModelOptionLabel({ name: m.model, ...m }) === md
              )
            : null;
        if (entry?.bodyStyle && BODY_STYLES.includes(entry.bodyStyle)) {
          next.bodyStyle = entry.bodyStyle;
        }
      }
      return next;
    });
    patch({ vehicles });
  };

  const catalogPreview = useMemo(() => {
    if (!previewRowId) return null;
    const row = vc.vehicles.find((r) => r._rowId === previewRowId);
    if (!row?.make || !row?.model) return null;
    return (
      catalog.carData[row.make]?.find(
        (m) =>
          m.model === row.model ||
          m.nickname === row.model ||
          formatModelOptionLabel({ name: m.model, ...m }) === row.model
      ) || null
    );
  }, [previewRowId, vc.vehicles, catalog.carData]);

  const addVehicle = (preset) => {
    const entry = preset
      ? catalog.carData[preset.make]?.find(
          (m) => m.model === preset.model || m.nickname === preset.model
        )
      : null;
    const row = {
      _rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      make: preset?.make || "",
      model: preset?.model || "",
      yearFrom: entry?.yearFrom ?? 1994,
      yearTo: entry?.yearTo ?? CURRENT_YEAR,
      bodyStyle: entry?.bodyStyle && BODY_STYLES.includes(entry.bodyStyle) ? entry.bodyStyle : "All",
      notes: entry?.description || "",
    };
    patch({ vehicles: [...vc.vehicles, row] });
  };

  const removeRows = (ids) => {
    const idSet = new Set(ids);
    patch({ vehicles: vc.vehicles.filter((r) => !idSet.has(r._rowId)) });
    setSelected(new Set());
  };

  const filteredVehicles = useMemo(() => {
    let rows = vc.vehicles;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.make.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }
    const yf = yearFilter.trim();
    if (yf) {
      const y = Number(yf);
      if (Number.isFinite(y)) {
        rows = rows.filter((r) => {
          const from = Number(r.yearFrom) || YEAR_MIN;
          const to = Number(r.yearTo) || CURRENT_YEAR;
          return y >= from && y <= to;
        });
      }
    }
    return rows;
  }, [vc.vehicles, search, yearFilter]);

  const toggleCategory = (id) => {
    const set = new Set(vc.categories || []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ categories: [...set] });
  };

  const showTable =
    vc.fitmentType === "specific" || vc.fitmentType === "semi-universal";

  const exportCsv = () => {
    const blob = new Blob([vehiclesToCsv(vc.vehicles)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle-fitment.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = vehiclesFromCsv(reader.result);
        if (!imported.length) {
          toast.error("No valid rows in CSV");
          return;
        }
        patch({ vehicles: [...vc.vehicles, ...imported] });
        toast.success(`Imported ${imported.length} row(s)`);
      } catch {
        toast.error("Could not parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const addYearRangeToSelected = () => {
    const from = window.prompt("Year from (e.g. 2010):", String(YEAR_MIN));
    const to = window.prompt("Year to:", String(CURRENT_YEAR));
    if (from == null || to == null) return;
    const yearFrom = Number(from);
    const yearTo = Number(to);
    if (!Number.isFinite(yearFrom) || !Number.isFinite(yearTo)) {
      toast.error("Invalid years");
      return;
    }
    const vehicles = vc.vehicles.map((row) =>
      selected.has(row._rowId) ? { ...row, yearFrom, yearTo } : row
    );
    patch({ vehicles });
    toast.success("Year range updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#374151]">Fitment type</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <FitmentTypeCard
            active={vc.fitmentType === "universal"}
            icon="🌐"
            title="Universal"
            description="Fits all cars"
            onClick={() => patch({ fitmentType: "universal" })}
          />
          <FitmentTypeCard
            active={vc.fitmentType === "specific"}
            icon="🚗"
            title="Specific"
            description="Selected makes/models"
            onClick={() => patch({ fitmentType: "specific" })}
          />
          <FitmentTypeCard
            active={vc.fitmentType === "semi-universal"}
            icon="⚡"
            title="Semi-Universal"
            description="Most cars, exceptions"
            onClick={() => patch({ fitmentType: "semi-universal" })}
          />
        </div>
      </div>

      {(vc.fitmentType === "universal" || vc.fitmentType === "semi-universal") && (
        <div>
          <label className="text-sm font-medium text-[#374151]">Universal note</label>
          <input
            type="text"
            value={vc.universalNote}
            onChange={(e) => patch({ universalNote: e.target.value })}
            placeholder="Fits all car makes and models"
            className={`mt-1 ${fieldClass}`}
          />
          <p className="mt-1 text-xs text-[#9ca3af]">
            e.g. Fits all cars with standard 52cm steering wheels
          </p>
        </div>
      )}

      {showTable ? (
        <>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Quick add popular Pakistani cars
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_ADD_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={catalogLoading}
                  onClick={() => addVehicle(preset)}
                  className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-medium text-[#374151] hover:border-[#1d6fb8] hover:text-[#1d6fb8] disabled:opacity-50"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addVehicle()}
              className="rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Add Vehicle
            </button>
            <button type="button" onClick={exportCsv} className="rounded-lg border px-3 py-1.5 text-sm">
              Export Fitment CSV
            </button>
            <button
              type="button"
              onClick={() => csvRef.current?.click()}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              Import Fitment CSV
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
          </div>

          {vc.vehicles.length > 3 ? (
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search make / model…"
                className={`max-w-xs ${fieldClass}`}
              />
              <input
                type="number"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="Filter by year"
                min={YEAR_MIN}
                max={YEAR_MAX}
                className={`max-w-[140px] ${fieldClass}`}
              />
            </div>
          ) : null}

          {catalogPreview ? (
            <div className="mb-3 flex gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#e5e7eb]">
                {catalogPreview.image ? (
                  <Image src={catalogPreview.image} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg font-bold text-[#9ca3af]">
                    {catalogPreview.model?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-[#111827]">
                  Catalog: {catalogPreview.model} ({catalogPreview.bodyStyle || "Sedan"})
                </p>
                {catalogPreview.description ? (
                  <p className="mt-1 text-xs text-[#6b7280]">{catalogPreview.description}</p>
                ) : null}
                {catalogPreview.popularAccessories?.length ? (
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Popular: {catalogPreview.popularAccessories.join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {selected.size > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-lg bg-[#fef3c7] px-3 py-2 text-sm">
              <span>{selected.size} selected</span>
              <button
                type="button"
                onClick={() => removeRows([...selected])}
                className="font-semibold text-red-700"
              >
                Delete selected
              </button>
              <button type="button" onClick={addYearRangeToSelected} className="font-semibold text-[#1d6fb8]">
                Add year range
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs font-semibold uppercase text-[#6b7280]">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={
                        filteredVehicles.length > 0 &&
                        filteredVehicles.every((r) => selected.has(r._rowId))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(filteredVehicles.map((r) => r._rowId)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Make</th>
                  <th className="px-2 py-2">Model</th>
                  <th className="px-2 py-2">Year from</th>
                  <th className="px-2 py-2">Year to</th>
                  <th className="px-2 py-2">Body</th>
                  <th className="px-2 py-2">Notes</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-[#9ca3af]">
                      No vehicles added. Use &quot;+ Add Vehicle&quot; or a quick-add button.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((row) => {
                    const modelsForMake = row.make
                      ? [
                          "All Models",
                          ...(catalog.carData[row.make]?.map((m) =>
                            formatModelOptionLabel({ name: m.model, ...m })
                          ) || []),
                        ]
                      : ["All Models"];
                    const modelEntry = row.make
                      ? catalog.carData[row.make]?.find(
                          (m) => m.model === row.model || m.nickname === row.model
                        )
                      : null;
                    const modelSelectValue = modelEntry
                      ? formatModelOptionLabel({ name: modelEntry.model, ...modelEntry })
                      : row.model;
                    const years = yearsForModelFromCatalog(catalog.carData, row.make, row.model);
                    return (
                      <tr key={row._rowId} className="border-t border-[#f3f4f6]">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(row._rowId)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(row._rowId);
                              else next.delete(row._rowId);
                              setSelected(next);
                            }}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <SearchableSelect
                            value={row.make}
                            onChange={(v) => {
                              const vehicles = vc.vehicles.map((r) =>
                                r._rowId === row._rowId
                                  ? { ...r, make: v === "All Makes" ? "" : v, model: "" }
                                  : r
                              );
                              patch({ vehicles });
                            }}
                            options={makeOptions}
                            placeholder="Make"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <SearchableSelect
                            value={modelSelectValue}
                            onChange={(v) => {
                              setPreviewRowId(row._rowId);
                              if (v === "All Models") {
                                patch({
                                  vehicles: vc.vehicles.map((r) =>
                                    r._rowId === row._rowId ? { ...r, model: "" } : r
                                  ),
                                });
                                return;
                              }
                              const entry = catalog.carData[row.make]?.find(
                                (m) => formatModelOptionLabel({ name: m.model, ...m }) === v
                              );
                              const modelVal = entry ? entry.nickname || entry.model : v;
                              patch({
                                vehicles: vc.vehicles.map((r) => {
                                  if (r._rowId !== row._rowId) return r;
                                  const next = { ...r, model: modelVal };
                                  if (entry?.bodyStyle && BODY_STYLES.includes(entry.bodyStyle)) {
                                    next.bodyStyle = entry.bodyStyle;
                                  }
                                  if (entry?.yearFrom != null) {
                                    next.yearFrom = entry.yearFrom;
                                    next.yearTo = entry.yearTo ?? CURRENT_YEAR;
                                  }
                                  return next;
                                }),
                              });
                            }}
                            options={modelsForMake}
                            placeholder="Model"
                            disabled={!row.make || row.make === "All Makes"}
                          />
                        </td>
                        <td className="px-2 py-2 w-24">
                          {years.length ? (
                            <select
                              value={row.yearFrom ?? ""}
                              onChange={(e) =>
                                updateVehicle(row._rowId, "yearFrom", Number(e.target.value))
                              }
                              className={fieldClass}
                            >
                              <option value="">—</option>
                              {years.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              min={YEAR_MIN}
                              max={YEAR_MAX}
                              value={row.yearFrom ?? ""}
                              onChange={(e) =>
                                updateVehicle(row._rowId, "yearFrom", Number(e.target.value) || null)
                              }
                              className={fieldClass}
                            />
                          )}
                        </td>
                        <td className="px-2 py-2 w-24">
                          <input
                            type="number"
                            min={YEAR_MIN}
                            max={YEAR_MAX}
                            value={row.yearTo ?? CURRENT_YEAR}
                            onChange={(e) =>
                              updateVehicle(row._rowId, "yearTo", Number(e.target.value) || CURRENT_YEAR)
                            }
                            className={fieldClass}
                          />
                        </td>
                        <td className="px-2 py-2 w-28">
                          <select
                            value={row.bodyStyle || "All"}
                            onChange={(e) => updateVehicle(row._rowId, "bodyStyle", e.target.value)}
                            className={fieldClass}
                          >
                            {BODY_STYLES.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[140px]">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateVehicle(row._rowId, "notes", e.target.value)}
                            placeholder="Optional notes"
                            className={fieldClass}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeRows([row._rowId])}
                            className="flex h-8 w-8 items-center justify-center rounded text-red-600 hover:bg-red-50"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {vc.fitmentType === "semi-universal" ? (
            <p className="text-xs text-[#6b7280]">
              Listed vehicles are <strong>exceptions</strong> — the product does not fit these makes/models/years.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="border-t border-[#e5e7eb] pt-4">
        <p className="text-sm font-medium text-[#374151]">Compatible car types</p>
        <p className="mt-1 text-xs text-[#9ca3af]">General categories (optional)</p>
        <div className="mt-3 flex flex-wrap gap-4">
          {CAR_TYPE_OPTIONS.map((opt) => (
            <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(vc.categories || []).includes(opt.id)}
                onChange={() => toggleCategory(opt.id)}
                className="rounded border-gray-300"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
