/**
 * Product editor — Sale schedule, low stock, SKU (pricing amounts & qty live in TabOptions).
 */
"use client";

import { useMemo } from "react";
import { toDatetimeLocalValue } from "@/lib/datetimeLocal";
import { computeProductSaleState } from "@/lib/productSale";

function randomSku() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return `SKU-${s}`;
}

export function TabPricing({ form, updateFormData }) {
  const fieldClass =
    "h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2";

  const sched = form.pricing?.saleSchedule || { enabled: false, startDate: "", endDate: "" };
  const saleState = useMemo(() => computeProductSaleState(form.pricing), [form.pricing]);

  const setPricing = (patch) => updateFormData("pricing", { ...form.pricing, ...patch });
  const setSchedule = (patch) =>
    setPricing({
      saleSchedule: { ...sched, ...patch },
    });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-[#111827]">Sale schedule</p>
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(sched.enabled)}
              onChange={(e) => setSchedule({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8] focus:ring-[#1d6fb8]"
            />
            <span className="text-sm font-medium text-[#374151]">Schedule sale</span>
          </label>
          <p className="mt-2 text-xs text-[#6b7280]">Leave schedule off to keep sale price always active when set.</p>

          {sched.enabled ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#374151]">Sale starts</label>
                <input
                  type="datetime-local"
                  value={typeof sched.startDate === "string" && sched.startDate.includes("T") ? sched.startDate : toDatetimeLocalValue(sched.startDate)}
                  onChange={(e) => setSchedule({ startDate: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#374151]">Sale ends</label>
                <input
                  type="datetime-local"
                  value={typeof sched.endDate === "string" && sched.endDate.includes("T") ? sched.endDate : toDatetimeLocalValue(sched.endDate)}
                  onChange={(e) => setSchedule({ endDate: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>
          ) : null}

          {sched.enabled && saleState.saleBadge === "active" ? (
            <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Sale Active</p>
          ) : null}
          {sched.enabled && saleState.saleBadge === "scheduled" ? (
            <p className="mt-3 inline-flex rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">Sale Scheduled</p>
          ) : null}
          {sched.enabled && saleState.saleBadge === "ended" ? (
            <p className="mt-3 inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-semibold text-[#6b7280]">Sale Ended</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-200 pt-8">
        <p className="text-sm font-semibold text-[#111827]">Inventory</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Low stock threshold</label>
          <input
            type="number"
            min={0}
            value={form.inventory.lowStockThreshold}
            onChange={(e) => updateFormData("inventory", { ...form.inventory, lowStockThreshold: e.target.value })}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-[#6b7280]">Alert when stock falls below this number.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">SKU</label>
          <div className="flex gap-2">
            <input
              value={form.inventory.sku}
              onChange={(e) => updateFormData("inventory", { ...form.inventory, sku: e.target.value })}
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => updateFormData("inventory", { ...form.inventory, sku: randomSku() })}
              className="shrink-0 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
