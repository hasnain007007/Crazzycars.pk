/**
 * Product editor — Add-ons & Features (same behavior as previous inline section).
 */
"use client";

import { RecommendedProductPicker } from "./RecommendedProductPicker";

export function TabAddons({ form, setForm, fieldClass, excludeProductId = "" }) {
  return (
    <div className="space-y-8">
      <RecommendedProductPicker
        value={form.recommendedProducts || []}
        excludeId={excludeProductId}
        fieldClass={fieldClass}
        onChange={(next) => setForm((f) => ({ ...f, recommendedProducts: next }))}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111827]">Add-ons</p>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, addOns: [...f.addOns, { name: "", price: 0, required: false }] }))}
            className="text-sm font-medium text-[#1d6fb8] hover:underline"
          >
            Add Add-on
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                <th className="pb-2 pr-2 font-medium">Name</th>
                <th className="pb-2 pr-2 font-medium">Price</th>
                <th className="pb-2 pr-2 font-medium">Required</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {form.addOns.map((row, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  <td className="py-2 pr-2">
                    <input
                      value={row.name}
                      onChange={(e) => {
                        const next = [...form.addOns];
                        next[i] = { ...row, name: e.target.value };
                        setForm((f) => ({ ...f, addOns: next }));
                      }}
                      className={fieldClass}
                      placeholder="e.g. Jewelry Cleaning Kit, Extra Ball, Gift Box"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...form.addOns];
                        next[i] = { ...row, price: Number(e.target.value) };
                        setForm((f) => ({ ...f, addOns: next }));
                      }}
                      className={fieldClass}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) => {
                        const next = [...form.addOns];
                        next[i] = { ...row, required: e.target.checked };
                        setForm((f) => ({ ...f, addOns: next }));
                      }}
                      className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-lg leading-none text-red-500 hover:text-red-700"
                      onClick={() => setForm((f) => ({ ...f, addOns: f.addOns.filter((_, j) => j !== i) }))}
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
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111827]">Features</p>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, features: [...f.features, ""] }))}
            className="text-sm font-medium text-[#1d6fb8] hover:underline"
          >
            Add Feature
          </button>
        </div>
        <div className="space-y-2">
          {form.features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="cursor-grab text-[#9ca3af]" aria-hidden>
                ⋮⋮
              </span>
              <input
                value={feat}
                placeholder={
                  i === 0
                    ? "e.g. 316L Surgical Steel - Safe for sensitive skin"
                    : i === 1
                      ? "e.g. Hypoallergenic and nickel-free"
                      : "e.g. Available in multiple gauge sizes"
                }
                onChange={(e) => {
                  const next = [...form.features];
                  next[i] = e.target.value;
                  setForm((f) => ({ ...f, features: next }));
                }}
                className={fieldClass}
              />
              <button
                type="button"
                className="text-lg text-red-500 hover:text-red-700"
                onClick={() => setForm((f) => ({ ...f, features: f.features.filter((_, j) => j !== i) }))}
                aria-label="Remove feature"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
