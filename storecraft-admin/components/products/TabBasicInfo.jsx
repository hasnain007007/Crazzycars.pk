/**
 * Product editor — Basic Info: name, slug, article, categories, short & long descriptions.
 */
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const TinyEditor = dynamic(() => import("@/components/ui/TinyEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 200,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#9ca3af",
      }}
    >
      Loading editor...
    </div>
  ),
});
import { generateSlugFromProductName } from "@/lib/slugify";

export function CategoryPicker({ options, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => options.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  const selected = useMemo(
    () => options.filter((c) => value.includes(String(c._id))),
    [options, value]
  );

  const toggle = (id) => {
    const sid = String(id);
    if (value.includes(sid)) onChange(value.filter((x) => x !== sid));
    else onChange([...value, sid]);
  };

  return (
    <div className="relative z-30 space-y-2">
      {open ? (
        <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
      ) : null}
      <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-[#e5e7eb] bg-white px-2 py-1.5">
        {selected.map((c) => (
          <span
            key={c._id}
            className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] py-0.5 pl-2.5 pr-1 text-sm font-medium text-[#1d4ed8]"
          >
            {c.name}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-blue-100"
              onClick={() => toggle(c._id)}
              aria-label={`Remove ${c.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selected.length ? "Search categories…" : "Search and add categories…"}
          className="min-w-[160px] flex-1 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-[#9ca3af]"
        />
      </div>
      {open ? (
        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[#6b7280]">No matches</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => {
                  toggle(c._id);
                  setQ("");
                }}
                className={[
                  "flex w-full px-3 py-2 text-left text-sm",
                  value.includes(String(c._id)) ? "bg-[#eff6ff] font-medium text-[#1d4ed8]" : "hover:bg-[#f9fafb]",
                ].join(" ")}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

const generateSlug = generateSlugFromProductName;

function cleanSlugDraft(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TabBasicInfo({
  form,
  setForm,
  onProductNameChange,
  categories,
  slugManual = false,
  setSlugManual,
  slugWarning,
  onSlugBlur,
  productId,
  clearSlugWarning,
}) {
  const fieldClass =
    "h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2";
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [localSlugWarning, setLocalSlugWarning] = useState("");

  const plainLength = (form.shortDescription || "").replace(/<[^>]*>/g, "").length;

  const checkSlugUnique = async (candidate) => {
    const slug = cleanSlugDraft(candidate);
    if (!slug) return { slug: "", warning: "" };
    try {
      const params = new URLSearchParams({ slug });
      if (productId && productId !== "new") params.set("excludeId", String(productId));
      const res = await fetch(`/api/products/check-slug?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) return { slug, warning: "" };
      if (json.available) return { slug, warning: "" };
      const suggested = cleanSlugDraft(json.suggestion || slug);
      return {
        slug: suggested || slug,
        warning: suggested && suggested !== slug ? `⚠️ This slug is already in use. Suggested: ${suggested}` : "",
      };
    } catch {
      return { slug, warning: "" };
    }
  };

  const handleSaveSlug = async () => {
    setSlugManual(true);
    const checked = await checkSlugUnique(slugDraft);
    setForm((f) => ({ ...f, slug: checked.slug }));
    setLocalSlugWarning(checked.warning);
    clearSlugWarning?.();
    setEditingSlug(false);
    setSlugDraft("");
    onSlugBlur?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-sm font-medium text-[#374151]" htmlFor="p-name">
            Product name <span className="text-red-500">*</span>
          </label>
          <input
            id="p-name"
            type="text"
            value={form.name || ""}
            onChange={(e) => {
              const newName = e.target.value;
              if (typeof onProductNameChange === "function") {
                onProductNameChange(newName);
                return;
              }
              if (!slugManual) {
                const autoSlug = newName
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-+|-+$/g, "");
                setForm((f) => ({
                  ...f,
                  name: newName,
                  slug: autoSlug,
                }));
              } else {
                setForm((f) => ({ ...f, name: newName }));
              }
            }}
            className={fieldClass}
            placeholder="e.g. Premium Leather Seat Cover Set — Toyota Corolla"
          />

          <div style={{ marginTop: 8 }}>
            {!editingSlug ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>Slug:</span>
                <strong
                  style={{
                    fontSize: 12,
                    color: "#009688",
                    fontFamily: "monospace",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                >
                  {form.slug || ""}
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(true);
                    setSlugDraft(form.slug || generateSlug(form.name || ""));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 12,
                    padding: "2px 6px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                  title="Edit slug"
                >
                  ✏️ Edit
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                }}
              >
                <input
                  type="text"
                  value={slugDraft}
                  autoFocus
                  onChange={(e) => setSlugDraft(cleanSlugDraft(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveSlug();
                    }
                    if (e.key === "Escape") {
                      setEditingSlug(false);
                      setSlugDraft("");
                    }
                  }}
                  style={{
                    flex: 1,
                    border: "1px solid #009688",
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    outline: "none",
                    color: "#009688",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveSlug()}
                  style={{
                    padding: "3px 8px",
                    background: "#009688",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(false);
                    setSlugDraft("");
                  }}
                  style={{
                    padding: "3px 8px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setSlugDraft(generateSlug(form.name || ""))}
                  style={{
                    padding: "3px 8px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Reset slug draft from product name"
                >
                  ↺ Auto
                </button>
              </div>
            )}

            {!editingSlug ? (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                  🔗 Full URL:{" "}
                  <span style={{ color: "#009688", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {(process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL}
                    /
                    <strong>{form.slug || ""}</strong>
                  </span>
                </p>
                {slugManual ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugManual(false);
                      clearSlugWarning?.();
                      setLocalSlugWarning("");
                      setForm((f) => ({
                        ...f,
                        slug: generateSlug(f.name || ""),
                      }));
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#009688",
                      cursor: "pointer",
                      fontSize: 11,
                      padding: 0,
                      marginTop: 6,
                      display: "block",
                    }}
                  >
                    (Reset to auto)
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="articleNo" className="mb-1.5 block text-sm font-medium text-[#374151]">
            Article No <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="articleNo"
            type="text"
            value={form.articleNo || ""}
            onChange={(e) => setForm((f) => ({ ...f, articleNo: e.target.value }))}
            placeholder="e.g. CG-001"
            className={fieldClass}
            style={{
              borderColor: !form.articleNo?.trim() ? "#dc2626" : "#e5e7eb",
            }}
          />
          {!form.articleNo?.trim() ? (
            <p
              style={{
                fontSize: 11,
                color: "#dc2626",
                margin: "4px 0 0",
              }}
            >
              Article No is required
            </p>
          ) : null}

          {/* EAN Number */}
          <div style={{ marginBottom: 16, marginTop: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              EAN Number
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  fontWeight: 400,
                  marginLeft: 6,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (European Article Number - 13 digits)
              </span>
            </label>
            <input
              type="text"
              value={form.ean || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 13) {
                  setForm((f) => ({ ...f, ean: val }));
                }
              }}
              placeholder="1234567890123"
              maxLength={13}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 14,
                color: "#111827",
                outline: "none",
                boxSizing: "border-box",
                background: "#fff",
                fontFamily: "monospace",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  margin: 0,
                }}
              >
                Used for barcode scanning and product identification
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: form.ean?.length === 13 ? "#16a34a" : "#9ca3af",
                  margin: 0,
                  fontWeight: form.ean?.length === 13 ? 600 : 400,
                }}
              >
                {form.ean?.length || 0}/13
              </p>
            </div>
            {form.ean && form.ean.length > 0 && form.ean.length !== 13 ? (
              <p
                style={{
                  fontSize: 11,
                  color: "#f59e0b",
                  margin: "4px 0 0",
                }}
              >
                EAN should be exactly 13 digits
              </p>
            ) : null}
            {form.ean?.length === 13 ? (
              <p
                style={{
                  fontSize: 11,
                  color: "#16a34a",
                  margin: "4px 0 0",
                  fontWeight: 600,
                }}
              >
                Valid EAN number ✓
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {localSlugWarning || slugWarning ? (
        <p className="text-xs font-medium text-amber-600">{localSlugWarning || slugWarning}</p>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#374151]">Categories</label>
        <CategoryPicker options={categories} value={form.categories} onChange={(v) => setForm((f) => ({ ...f, categories: v }))} />
      </div>

      <div>
        <div className="mb-1.5 flex justify-between gap-2">
          <span className="text-sm font-medium text-[#374151]">Short description</span>
        </div>
        <TinyEditor
          value={form.shortDescription || ""}
          onChange={(val) =>
            setForm((f) => ({
              ...f,
              shortDescription: val,
            }))
          }
          height={200}
          placeholder="Write short product description..."
        />
        <div className="mt-1 text-right">
          <span className={`text-xs tabular-nums ${plainLength > 300 ? "font-medium text-red-600" : "text-[#6b7280]"}`}>
            {plainLength}/300
          </span>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#374151]">Long description</span>
        <TinyEditor
          value={form.longDescription || ""}
          onChange={(html) => setForm((f) => ({ ...f, longDescription: html }))}
          height={500}
          placeholder="Write your product description..."
        />
      </div>
    </div>
  );
}
