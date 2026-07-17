"use client";

import RichTextEditor from "@/components/ui/RichTextEditor";

const MEASUREMENT_TEMPLATES = [
  { key: "chest", label: "Chest", placeholder: "e.g. 38", helpText: "Measure around the fullest part" },
  { key: "waist", label: "Waist", placeholder: "e.g. 32", helpText: "Measure around natural waistline" },
  { key: "hips", label: "Hips", placeholder: "e.g. 40", helpText: "Measure around the fullest part of hips" },
  { key: "length", label: "Length/Height", placeholder: "e.g. 165", helpText: "Your full height" },
  { key: "shoulder", label: "Shoulder Width", placeholder: "e.g. 16", helpText: "Measure shoulder point to shoulder point" },
  { key: "sleeve", label: "Sleeve Length", placeholder: "e.g. 24", helpText: "Measure shoulder seam to wrist" },
  { key: "inseam", label: "Inseam", placeholder: "e.g. 30", helpText: "Measure crotch seam to ankle" },
  { key: "height", label: "Height", placeholder: "e.g. 170", helpText: "Your full body height" },
  { key: "weight", label: "Weight", placeholder: "e.g. 70", helpText: "Your current body weight" },
  { key: "neck", label: "Neck", placeholder: "e.g. 15", helpText: "Measure around the base of your neck" },
  { key: "custom", label: "Custom", placeholder: "e.g. value", helpText: "Provide any additional measurement" },
];

function blankField() {
  return {
    fieldName: "",
    label: "",
    placeholder: "",
    required: true,
    minValue: "",
    maxValue: "",
    helpText: "",
  };
}

function applyTemplate(t) {
  return {
    fieldName: t.label,
    label: t.label,
    placeholder: t.placeholder || "",
    required: true,
    minValue: "",
    maxValue: "",
    helpText: t.helpText || "",
  };
}

export function TabVariationsSizing({ form, setForm, fieldClass }) {
  const unitSuffix = form.customSizing?.unit === "inches" ? "in" : "cm";

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold text-blue-900">📏 Custom Size / Measurements</h3>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-900">
        <input
          type="checkbox"
          checked={Boolean(form.customSizing?.enabled)}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              customSizing: { ...f.customSizing, enabled: e.target.checked },
            }))
          }
          className="h-4 w-4 rounded border-blue-300 text-[#1d6fb8]"
        />
        Enable custom measurements for this product
      </label>

      {form.customSizing?.enabled ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#374151]">Section title shown to customer</label>
              <input
                value={form.customSizing.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customSizing: { ...f.customSizing, title: e.target.value },
                  }))
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#374151]">Unit selector</label>
              <select
                value={form.customSizing.unit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customSizing: { ...f.customSizing, unit: e.target.value },
                  }))
                }
                className={fieldClass}
              >
                <option value="cm">cm</option>
                <option value="inches">inches</option>
                <option value="both">both</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#374151]">Help text shown to customer</label>
            <RichTextEditor
              variant="lite"
              value={form.customSizing.description || ""}
              onChange={(html) =>
                setForm((f) => ({
                  ...f,
                  customSizing: { ...f.customSizing, description: html },
                }))
              }
              placeholder="Instructions shown above the measurement fields…"
              minHeight={120}
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Quick templates</p>
              {MEASUREMENT_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      customSizing: {
                        ...f.customSizing,
                        fields: [...(f.customSizing?.fields || []), applyTemplate(t)],
                      },
                    }))
                  }
                  className="rounded-full border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  + {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  customSizing: {
                    ...f.customSizing,
                    fields: [...(f.customSizing?.fields || []), blankField()],
                  },
                }))
              }
              className="rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#185f9e]"
            >
              Add Measurement Field
            </button>
          </div>

          <div className="space-y-3">
            {(form.customSizing?.fields || []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-blue-200 bg-white px-4 py-4 text-sm text-[#6b7280]">
                No measurement fields added yet.
              </p>
            ) : (
              (form.customSizing.fields || []).map((field, idx) => (
                <div key={idx} className="rounded-lg border border-blue-200 bg-white p-3">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Field Name*</label>
                      <input
                        value={field.fieldName || ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = { ...field, fieldName: e.target.value };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Label*</label>
                      <input
                        value={field.label || ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = { ...field, label: e.target.value };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Placeholder</label>
                      <input
                        value={field.placeholder || ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = { ...field, placeholder: e.target.value };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#374151]">
                        <input
                          type="checkbox"
                          checked={field.required !== false}
                          onChange={(e) => {
                            const fields = [...form.customSizing.fields];
                            fields[idx] = { ...field, required: e.target.checked };
                            setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                          }}
                          className="h-4 w-4 rounded border-[#d1d5db] text-[#1d6fb8]"
                        />
                        Required
                      </label>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Min</label>
                      <input
                        type="number"
                        value={field.minValue ?? ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = {
                            ...field,
                            minValue: e.target.value === "" ? "" : Number(e.target.value),
                          };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Max</label>
                      <input
                        type="number"
                        value={field.maxValue ?? ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = {
                            ...field,
                            maxValue: e.target.value === "" ? "" : Number(e.target.value),
                          };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Help text</label>
                      <input
                        value={field.helpText || ""}
                        onChange={(e) => {
                          const fields = [...form.customSizing.fields];
                          fields[idx] = { ...field, helpText: e.target.value };
                          setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => {
                        const fields = form.customSizing.fields.filter((_, i) => i !== idx);
                        setForm((f) => ({ ...f, customSizing: { ...f.customSizing, fields } }));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Customer form preview</p>
            <div className="space-y-3">
              <h4 className="font-semibold text-[#111827]">📏 {form.customSizing.title || "Enter Your Measurements"}</h4>
              <div
                className="tiptap-editor-content text-sm text-[#6b7280] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: form.customSizing.description?.trim()
                    ? form.customSizing.description
                    : "<p>Enter your measurements for a perfect fit</p>",
                }}
              />
              {(form.customSizing.fields || []).map((field, i) => (
                <div key={i}>
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    {field.label || field.fieldName || `Field ${i + 1}`}
                    {field.required !== false ? <span className="text-red-500"> *</span> : null}
                  </label>
                  <div className="relative">
                    <input
                      disabled
                      placeholder={field.placeholder || "Enter value"}
                      className="h-10 w-full rounded-lg border border-[#dbeafe] bg-[#f8fbff] px-3 pr-14 text-sm"
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center rounded bg-blue-100 px-2 text-xs font-medium text-blue-700">
                      {unitSuffix}
                    </span>
                  </div>
                  {field.helpText ? <p className="mt-1 text-xs text-[#6b7280]">{field.helpText}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
