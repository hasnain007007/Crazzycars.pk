/**
 * Product editor — compact Options grid (pricing + inventory toggles + status + watermark).
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { computeProductSaleState } from "@/lib/productSale";
import { computeShippingForZone, pickShippingZone } from "@/lib/shippingZoneWeight";
import { formatAdminPrice } from "@/lib/currency";

const WEIGHT_UNIT_OPTIONS = [
  { value: "g", label: "g (grams)" },
  { value: "kg", label: "kg (kilograms)" },
  { value: "lb", label: "lb (pounds)" },
  { value: "oz", label: "oz (ounces)" },
];

function toKg(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = String(unit || "g").toLowerCase();
  if (u === "g") return n / 1000;
  if (u === "lb") return n * 0.45359237;
  if (u === "oz") return n * 0.0283495231;
  return n;
}

export function TabOptions({
  form,
  setForm,
  updateFormData,
  fieldClass,
  watermarkEnabled,
  onWatermarkEnabledChange,
}) {
  const [activeZones, setActiveZones] = useState([]);
  const saleState = useMemo(() => computeProductSaleState(form.pricing), [form.pricing]);
  const pctOff = useMemo(() => {
    const r = Number(form.pricing.regularPrice);
    const s = saleState.effectiveSalePrice;
    if (!Number.isFinite(r) || r <= 0 || s == null || !Number.isFinite(s) || s >= r) return null;
    return Math.round(((r - s) / r) * 100);
  }, [form.pricing.regularPrice, saleState.effectiveSalePrice]);
  const baseWeightKg = useMemo(
    () => toKg(form.inventory?.weight, form.inventory?.weightUnit),
    [form.inventory?.weight, form.inventory?.weightUnit]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shipping?status=active", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json?.success) setActiveZones(Array.isArray(json.zones) ? json.zones : []);
      } catch {
        if (!cancelled) setActiveZones([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewZone =
    pickShippingZone(activeZones, "Pakistan", "") ||
    activeZones.find((z) => Array.isArray(z.weightRanges) && z.weightRanges.length) ||
    activeZones[0] ||
    null;
  const baseWeightRaw = Number(form.inventory?.weight);
  const hasPositiveBaseWeight = Number.isFinite(baseWeightRaw) && baseWeightRaw > 0;
  const hasVariants = Array.isArray(form.variants) && form.variants.length > 0;
  const orderTotalPreview = Number(form.pricing?.regularPrice) || 0;
  const baseOnlyShippingEst =
    hasPositiveBaseWeight && previewZone
      ? computeShippingForZone(previewZone, Math.round(baseWeightKg * 1000), orderTotalPreview).shippingCost
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Quantity</label>
          <input
            type="number"
            min={0}
            value={form.inventory.quantity}
            onChange={(e) => updateFormData("inventory", { ...form.inventory, quantity: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">
            Regular price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6b7280]">
              Rs.
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.pricing.regularPrice}
              onChange={(e) => updateFormData("pricing", { ...form.pricing, regularPrice: e.target.value })}
              className={`${fieldClass} pl-12`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Sale price</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6b7280]">
              Rs.
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.pricing.salePrice}
              onChange={(e) => updateFormData("pricing", { ...form.pricing, salePrice: e.target.value })}
              className={`${fieldClass} pl-12`}
            />
          </div>
          {pctOff != null ? (
            <p className="mt-1 text-xs font-medium text-emerald-600">
              {pctOff}% OFF
              {saleState.isOnSale ? <span className="ml-2 text-[#6b7280]">(effective sale)</span> : null}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Weight</label>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              value={form.inventory.weight}
              onChange={(e) => updateFormData("inventory", { ...form.inventory, weight: e.target.value })}
              className={`${fieldClass} min-w-[60px] flex-1`}
            />
            <select
              value={form.inventory.weightUnit || "g"}
              onChange={(e) => updateFormData("inventory", { ...form.inventory, weightUnit: e.target.value })}
              className={`${fieldClass} h-10 min-w-[7rem] shrink-0 px-2`}
            >
              {WEIGHT_UNIT_OPTIONS.map(({ value: u, label }) => (
                <option key={u} value={u}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 md:min-h-[2.5rem] md:self-end">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8] focus:ring-[#1d6fb8]"
          />
          <span className="text-sm font-medium text-[#374151]">Featured</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 md:min-h-[2.5rem] md:self-end">
          <input
            type="checkbox"
            checked={form.inventory.trackInventory}
            onChange={(e) => updateFormData("inventory", { ...form.inventory, trackInventory: e.target.checked })}
            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8] focus:ring-[#1d6fb8]"
          />
          <span className="text-sm font-medium text-[#374151]">Track inventory</span>
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={fieldClass}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 md:min-h-[2.5rem] md:self-end">
          <input
            type="checkbox"
            checked={form.newArrival}
            onChange={(e) => setForm((f) => ({ ...f, newArrival: e.target.checked }))}
            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8] focus:ring-[#1d6fb8]"
          />
          <span className="text-sm font-medium text-[#374151]">New arrival</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 md:min-h-[2.5rem] md:self-end">
          <input
            type="checkbox"
            checked={Boolean(watermarkEnabled)}
            onChange={(e) => onWatermarkEnabledChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8] focus:ring-[#1d6fb8]"
          />
          <span className="text-sm font-medium text-[#374151]">Watermark</span>
        </label>
      </div>

      <div className="rounded-lg border-2 border-[#e5e7eb] bg-[#fffbeb] p-4 shadow-sm ring-1 ring-amber-100">
        <p className="text-base font-semibold text-[#111827]">📦 Base Shipping Weight</p>
        <p className="mt-1 text-xs text-[#6b7280]">Used as the starting weight for every shipping quote (plus each variant’s +Ship column).</p>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            value={form.inventory.weight}
            onChange={(e) => updateFormData("inventory", { ...form.inventory, weight: e.target.value })}
            className={`${fieldClass} min-w-[60px] flex-1`}
          />
          <select
            value={form.inventory.weightUnit || "g"}
            onChange={(e) => updateFormData("inventory", { ...form.inventory, weightUnit: e.target.value })}
            className={`${fieldClass} h-10 min-w-[7rem] shrink-0 px-2`}
          >
            {WEIGHT_UNIT_OPTIONS.map(({ value: u, label }) => (
              <option key={u} value={u}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {!hasPositiveBaseWeight ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            ⚠️ Set base weight for shipping calculation
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#93c5fd] bg-[#eff6ff] p-4">
        <p className="text-sm font-semibold text-[#1e3a8a]">Shipping calculation preview</p>
        <p className="mt-1 text-xs text-[#1e40af]/80">
          Uses your first active zone with weight ranges (same city + weight logic as the storefront).
        </p>
        <p className="mt-2 text-sm font-medium text-[#111827]">
          Base weight: <span className="tabular-nums">{baseWeightKg.toFixed(3)} kg</span>
        </p>
        {hasPositiveBaseWeight && hasVariants ? (
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md border border-[#bfdbfe] bg-white p-2 text-xs text-[#374151]">
            {(form.variants || []).map((variant, idx) => {
              const label = (variant.combination || []).join(" / ") || `Variant ${idx + 1}`;
              const shipW = variant.additionalShippingWeight;
              const shipU = variant.weightUnit || "g";
              const sur = variant.shippingPriceSurcharge;
              const extraKg = toKg(shipW, shipU);
              const totalKg = baseWeightKg + extraKg;
              const est = previewZone
                ? computeShippingForZone(
                    previewZone,
                    Math.round(totalKg * 1000),
                    orderTotalPreview
                  ).shippingCost
                : 0;
              return (
                <div key={`var-${idx}-${label}`} className="rounded border border-[#e5e7eb] bg-[#f8fafc] px-2 py-2">
                  <p>
                    <span className="font-semibold text-[#0f172a]">{label}</span>
                    <span className="text-[#64748b]">
                      {" "}
                      — base + <span className="tabular-nums">{extraKg.toFixed(3)}</span> kg ={" "}
                      <span className="tabular-nums font-medium text-[#0f172a]">{totalKg.toFixed(3)}</span> kg total
                    </span>
                  </p>
                  <p className="mt-1 font-medium text-[#1d4ed8]">
                    Estimated shipping:{" "}
                    {previewZone ? `${formatAdminPrice(est)} (${previewZone.name})` : "Add an active shipping zone with weight ranges"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : hasPositiveBaseWeight && form.variations?.length ? (
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-md border border-[#bfdbfe] bg-white p-2 text-xs text-[#374151]">
            {form.variations.flatMap((v, vidx) => {
              const opts = Array.isArray(v?.options) ? v.options : [];
              if (!opts.length) return [];
              return opts.map((opt, oidx) => {
                const label = typeof opt === "string" ? opt : opt?.value || "Option";
                const shipW = typeof opt === "string" ? "" : opt?.additionalShippingWeight;
                const shipU = typeof opt === "string" ? "g" : opt?.shippingWeightUnit || opt?.weightUnit || "g";
                const sur = typeof opt === "string" ? "" : opt?.shippingPriceSurcharge;
                const extraKg = toKg(shipW, shipU);
                const totalKg = baseWeightKg + extraKg;
                const est = previewZone
                  ? computeShippingForZone(
                      previewZone,
                      Math.round(totalKg * 1000),
                      orderTotalPreview
                    ).shippingCost
                  : 0;
                return (
                  <div
                    key={`${v.name || "v"}-${vidx}-${label}-${oidx}`}
                    className="rounded border border-[#e5e7eb] bg-[#f8fafc] px-2 py-2"
                  >
                    <p>
                      {v.name || `Variation ${vidx + 1}`} → <span className="font-semibold text-[#0f172a]">{label}</span>
                      <span className="text-[#64748b]">
                        {" "}
                        — base + <span className="tabular-nums">{extraKg.toFixed(3)}</span> kg ={" "}
                        <span className="tabular-nums font-medium text-[#0f172a]">{totalKg.toFixed(3)}</span> kg
                      </span>
                    </p>
                    <p className="mt-1 font-medium text-[#1d4ed8]">
                      Estimated shipping:{" "}
                      {previewZone ? `${formatAdminPrice(est)} (${previewZone.name})` : "Add an active shipping zone with weight ranges"}
                    </p>
                  </div>
                );
              });
            })}
          </div>
        ) : hasPositiveBaseWeight ? (
          <div className="mt-3 rounded-md border border-[#bfdbfe] bg-white px-3 py-3 text-sm text-[#374151]">
            <p className="font-medium text-[#0f172a]">Base weight only (no variants yet)</p>
            <p className="mt-1 text-xs text-[#64748b]">
              Example for <span className="tabular-nums">{baseWeightKg.toFixed(3)}</span> kg, no extra ship weight:
            </p>
            <p className="mt-2 text-base font-semibold text-[#1d4ed8]">
              {previewZone
                ? `≈ ${formatAdminPrice(baseOnlyShippingEst ?? 0)} (${previewZone.name})`
                : "Configure an active shipping zone to see an estimate."}
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            Set a base shipping weight above to see estimates. With variants, each row adds its +Ship weight to that base.
          </p>
        )}
      </div>
    </div>
  );
}
