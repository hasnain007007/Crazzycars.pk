"use client";

import { TagInput } from "@/components/ui/TagInput";

export function TabOrganisation({ form, setForm, fieldClass }) {
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Product Type</label>
        <input
          type="text"
          value={form.productType ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}
          placeholder="e.g. Seat Covers, Floor Mats, Steering Covers"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-gray-500">Categorize your product type</p>
      </div>
      <div>
        <label className={labelClass}>Vendor / Brand</label>
        <input
          type="text"
          value={form.vendor ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
          placeholder="e.g. Premium Leather, Universal Fit, OEM Style"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-gray-500">The manufacturer or brand for this product</p>
      </div>
      <div>
        <label className={labelClass}>Collections</label>
        <TagInput
          value={Array.isArray(form.collections) ? form.collections : []}
          onChange={(tags) => setForm((f) => ({ ...f, collections: tags }))}
          placeholder="e.g. Leather, Rubber, Universal Fit"
        />
        <p className="mt-1 text-xs text-gray-500">Group products into collections</p>
      </div>
      <div>
        <label className={labelClass}>Tags</label>
        <TagInput
          value={Array.isArray(form.tags) ? form.tags : []}
          onChange={(tags) => setForm((f) => ({ ...f, tags: tags }))}
          placeholder="e.g. car accessories, seat covers, floor mats, Crazzycars.pk"
        />
        <p className="mt-1 text-xs text-gray-500">Add tags for search and filtering</p>
      </div>
    </div>
  );
}
