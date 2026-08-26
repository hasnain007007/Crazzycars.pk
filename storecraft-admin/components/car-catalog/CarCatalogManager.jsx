"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ModelProductsPanel } from "@/components/car-catalog/ModelProductsPanel";
import { formatModelCardSubtitle } from "@/lib/carCatalogDisplay";
import { MODEL_BODY_STYLES } from "@/lib/carCatalogNormalize";
import { slugify, yearsFromRange } from "@/lib/carCatalogUtils";

const COUNTRY_FLAGS = {
  Japan: "🇯🇵",
  "South Korea": "🇰🇷",
  Korea: "🇰🇷",
  China: "🇨🇳",
  Malaysia: "🇲🇾",
  Germany: "🇩🇪",
  USA: "🇺🇸",
  Pakistan: "🇵🇰",
  Various: "🌐",
};

/**
 * Slug for catalog model — must stay unique per make.
 * Prefer nickname, then generation, then name + year range (matches API normalize).
 */
function generateModelSlug(name, nickname, yearFrom, yearTo, generation) {
  const nick = String(nickname || "").trim();
  if (nick) return slugify(nick);
  const modelName = String(name || "").trim();
  if (!modelName) return "";
  const gen = String(generation || "").trim();
  if (gen) return slugify(`${modelName}-${gen}`);
  const base = slugify(modelName);
  const yf = yearFrom != null && yearFrom !== "" ? Number(yearFrom) : null;
  const yt = yearTo != null && yearTo !== "" ? Number(yearTo) : null;
  if (base && Number.isFinite(yf) && Number.isFinite(yt)) return `${base}-${yf}-${yt}`;
  if (base && Number.isFinite(yf)) return `${base}-${yf}`;
  return base;
}

function resolveModelSlugForSave(m) {
  // Always derive from nickname/generation/years so generations of the same
  // model name stay unique (stale manual slugs like bare "city" caused false blocks).
  const derived = generateModelSlug(m?.name, m?.nickname, m?.yearFrom, m?.yearTo, m?.generation);
  const manual = String(m?.slug || "").trim();
  if (manual) {
    const manualSlug = slugify(manual);
    const bareName = slugify(m?.name);
    // Keep a custom slug only when it already distinguishes this generation.
    if (manualSlug && manualSlug !== bareName) return manualSlug;
  }
  return derived;
}

/** Returns conflicting slug labels, or [] if all unique. */
function findDuplicateModelSlugs(models) {
  const seen = new Map();
  const conflicts = [];
  for (const m of models || []) {
    const slug = resolveModelSlugForSave(m);
    if (!slug) continue;
    if (seen.has(slug)) {
      const label = String(m.nickname || m.generation || m.name || slug).trim();
      if (!conflicts.includes(label)) conflicts.push(label);
    } else {
      seen.set(slug, m);
    }
  }
  return conflicts;
}

function patchModelSlug(draft) {
  return {
    ...draft,
    slug: generateModelSlug(
      draft.name,
      draft.nickname,
      draft.yearFrom,
      draft.yearTo,
      draft.generation
    ),
  };
}

function emptyVariant() {
  return { name: "", yearFrom: 2020, yearTo: new Date().getFullYear(), isActive: true };
}

function emptyModel() {
  return {
    _id: undefined,
    name: "",
    slug: "",
    yearFrom: 2020,
    yearTo: new Date().getFullYear(),
    isActive: true,
    bodyStyle: "Sedan",
    image: "",
    description: "",
    popularAccessories: [],
    popularAccessoriesText: "",
    generation: "",
    nickname: "",
    isPopular: false,
    popularOrder: 0,
    variants: [],
  };
}

function extractImageUrl(imgs) {
  if (typeof imgs === "string") return imgs.trim();
  if (imgs && typeof imgs === "object" && !Array.isArray(imgs) && imgs.url) {
    return String(imgs.url).trim();
  }
  if (Array.isArray(imgs) && imgs[0]?.url) return String(imgs[0].url).trim();
  return "";
}

function CatalogImageField({ label, value, onChange, uploadFolder, previewMaxHeight = 150 }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      {value ? (
        <div
          className="flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-2"
          style={{ maxHeight: previewMaxHeight }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-w-full object-contain"
            style={{ maxHeight: previewMaxHeight - 16 }}
          />
        </div>
      ) : null}
      <ImageUploader
        value={value ? [{ url: value, isMain: true }] : []}
        onChange={(imgs) => onChange(extractImageUrl(imgs))}
        multiple={false}
        enableWatermark={false}
        uploadFolder={uploadFolder}
        showControls={false}
        galleryLayout={false}
      />
      <input
        type="url"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Or paste image URL directly"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function emptyMake() {
  return {
    _id: undefined,
    name: "",
    slug: "",
    order: 0,
    isActive: true,
    logo: "",
    country: "Japan",
    models: [],
  };
}

function modelToForm(m) {
  const years = Array.isArray(m.years) ? m.years : [];
  const sorted = [...years].sort((a, b) => a - b);
  return {
    _id: m._id,
    name: m.name || "",
    slug: m.slug || "",
    yearFrom: m.yearFrom ?? (sorted.length ? sorted[0] : 2020),
    yearTo: m.yearTo ?? (sorted.length ? sorted[sorted.length - 1] : new Date().getFullYear()),
    isActive: m.isActive !== false,
    bodyStyle: MODEL_BODY_STYLES.includes(m.bodyStyle) ? m.bodyStyle : "Sedan",
    image: m.image || "",
    description: m.description || "",
    popularAccessories: Array.isArray(m.popularAccessories) ? m.popularAccessories : [],
    popularAccessoriesText: Array.isArray(m.popularAccessories) ? m.popularAccessories.join(", ") : "",
    generation: m.generation || "",
    nickname: m.nickname || "",
    isPopular: !!m.isPopular,
    popularOrder: Number(m.popularOrder) || 0,
    variants: Array.isArray(m.variants)
      ? m.variants.map((v) => ({
          name: v.name || "",
          yearFrom: v.yearFrom ?? m.yearFrom ?? 2020,
          yearTo: v.yearTo ?? m.yearTo ?? new Date().getFullYear(),
          isActive: v.isActive !== false,
        }))
      : [],
  };
}

function makeToForm(make) {
  return {
    _id: make._id,
    name: make.name || "",
    slug: make.slug || "",
    order: make.order ?? 0,
    isActive: make.isActive !== false,
    logo: make.logo || "",
    country: make.country || "Japan",
    models: (make.models || []).map(modelToForm),
  };
}

function ModelModal({ draft, setDraft, onClose, onSave, saving }) {
  if (!draft) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{draft._id ? "Edit Model" : "Add Model"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Model name *</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => patchModelSlug({ ...d, name: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Slug</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Body style</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.bodyStyle}
              onChange={(e) => setDraft((d) => ({ ...d, bodyStyle: e.target.value }))}
            >
              {MODEL_BODY_STYLES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Generation</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.generation}
              onChange={(e) =>
                setDraft((d) => patchModelSlug({ ...d, generation: e.target.value }))
              }
              placeholder="e.g. 10th Gen, 8th Gen"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Popular Name / Nickname</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.nickname}
              onChange={(e) =>
                setDraft((d) => patchModelSlug({ ...d, nickname: e.target.value }))
              }
              placeholder="e.g. Civic X, Civic Reborn, Altis"
            />
            <span className="mt-1 block text-xs text-slate-500">
              How Pakistanis commonly refer to this model
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">Year from</span>
              <input
                type="number"
                min={1980}
                max={2026}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={draft.yearFrom}
                onChange={(e) =>
                  setDraft((d) => patchModelSlug({ ...d, yearFrom: Number(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Year to</span>
              <input
                type="number"
                min={1980}
                max={2026}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={draft.yearTo}
                onChange={(e) =>
                  setDraft((d) => patchModelSlug({ ...d, yearTo: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <CatalogImageField
            label="Model image"
            value={draft.image}
            onChange={(url) => setDraft((d) => ({ ...d, image: url }))}
            uploadFolder="storecraft/cars/models"
            previewMaxHeight={150}
          />
          <label className="block text-sm">
            <span className="font-medium">Description</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Popular accessories</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.popularAccessoriesText}
              onChange={(e) => setDraft((d) => ({ ...d, popularAccessoriesText: e.target.value }))}
              placeholder="Seat Covers, Floor Mats, Steering Cover"
            />
          </label>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Variants / Trims</p>
                <p className="text-xs text-slate-500">e.g. GLI, XLI, VXR, Oriel</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--color-primary)]"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    variants: [...(d.variants || []), emptyVariant()],
                  }))
                }
              >
                + Add Variant
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {(draft.variants || []).length === 0 ? (
                <p className="text-xs text-slate-400">No variants added yet.</p>
              ) : null}
              {(draft.variants || []).map((variant, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 sm:grid-cols-[1fr_80px_80px_auto_auto] sm:items-end">
                  <label className="block text-xs">
                    <span className="font-medium">Name</span>
                    <input
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      value={variant.name}
                      onChange={(e) =>
                        setDraft((d) => {
                          const variants = [...(d.variants || [])];
                          variants[idx] = { ...variants[idx], name: e.target.value };
                          return { ...d, variants };
                        })
                      }
                      placeholder="GLI"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium">From</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      value={variant.yearFrom}
                      onChange={(e) =>
                        setDraft((d) => {
                          const variants = [...(d.variants || [])];
                          variants[idx] = { ...variants[idx], yearFrom: Number(e.target.value) };
                          return { ...d, variants };
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium">To</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      value={variant.yearTo}
                      onChange={(e) =>
                        setDraft((d) => {
                          const variants = [...(d.variants || [])];
                          variants[idx] = { ...variants[idx], yearTo: Number(e.target.value) };
                          return { ...d, variants };
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={variant.isActive !== false}
                      onChange={(e) =>
                        setDraft((d) => {
                          const variants = [...(d.variants || [])];
                          variants[idx] = { ...variants[idx], isActive: e.target.checked };
                          return { ...d, variants };
                        })
                      }
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        variants: (d.variants || []).filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save model"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CarCatalogManager() {
  const [makes, setMakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyMake());
  const [saving, setSaving] = useState(false);
  const [makeSearch, setMakeSearch] = useState("");
  const [modelModal, setModelModal] = useState(null);
  const [modelDraft, setModelDraft] = useState(null);
  const [modelEditIndex, setModelEditIndex] = useState(null);
  const [productsPanel, setProductsPanel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/car-catalog", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to load catalog");
        return;
      }
      const list = data.makes || [];
      setMakes(list);
      if (list.length) {
        setSelectedId((prev) => {
          const found = list.find((m) => String(m._id) === String(prev)) || list[0];
          setForm(makeToForm(found));
          return String(found._id);
        });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    const found = makes.find((m) => String(m._id) === String(selectedId));
    if (found) setForm(makeToForm(found));
  }, [selectedId, makes]);

  const filteredMakes = useMemo(() => {
    const q = makeSearch.trim().toLowerCase();
    const sorted = [...makes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!q) return sorted;
    return sorted.filter((m) => m.name.toLowerCase().includes(q));
  }, [makes, makeSearch]);

  async function saveMake() {
    if (saving) return;
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Make name must be at least 2 characters");
      return;
    }

    const modelsForSave = form.models.map((m) => ({
      ...m,
      slug: resolveModelSlugForSave(m),
    }));
    const conflicts = findDuplicateModelSlugs(modelsForSave);
    if (conflicts.length) {
      toast.error(
        `Duplicate model slug. Give each generation a unique nickname or generation (conflict: ${conflicts.join(", ")}).`
      );
      return;
    }

    setSaving(true);
    try {
      const makePayload = {
        name,
        slug: slugify(form.slug || name),
        country: form.country || "Japan",
        logo: String(form.logo || "").trim(),
        isActive: form.isActive !== false,
        order: Number(form.order) || 0,
        models: modelsForSave.map((m) => ({
          _id: m._id,
          name: m.name.trim(),
          slug: m.slug,
          image: String(m.image || "").trim(),
          generation: m.generation || "",
          nickname: m.nickname || "",
          bodyStyle: m.bodyStyle || "Sedan",
          yearFrom: m.yearFrom,
          yearTo: m.yearTo,
          isPopular: !!m.isPopular,
          popularOrder: Number(m.popularOrder) || 0,
          isActive: m.isActive !== false,
          variants: (m.variants || [])
            .map((v) => ({
              name: String(v.name || "").trim(),
              yearFrom: Number(v.yearFrom) || m.yearFrom,
              yearTo: Number(v.yearTo) || m.yearTo,
              isActive: v.isActive !== false,
            }))
            .filter((v) => v.name),
          years: yearsFromRange(m.yearFrom, m.yearTo),
          description: m.description || "",
          popularAccessories: m.popularAccessoriesText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        })),
      };

      if (process.env.NODE_ENV === "development") {
        console.log("Saving make:", JSON.stringify(makePayload));
      }

      const isNew = !form._id;
      const url = isNew ? "/api/car-catalog" : `/api/car-catalog/${form._id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makePayload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("Saved — cars will show on the homepage", { duration: 4000 });
      if (data.make) {
        setForm(makeToForm(data.make));
        setSelectedId(String(data.make._id));
        setMakes((prev) => {
          const id = String(data.make._id);
          const next = prev.filter((m) => String(m._id) !== id);
          return [...next, data.make].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      } else {
        await load();
        if (form._id) setSelectedId(String(form._id));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  function openModelModal(index) {
    if (index === "new") {
      setModelEditIndex(null);
      setModelDraft(emptyModel());
    } else {
      setModelEditIndex(index);
      setModelDraft({ ...form.models[index] });
    }
    setModelModal(true);
  }

  function updateModelAt(index, patch) {
    setForm((f) => ({
      ...f,
      models: f.models.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function toggleModelPopular(index) {
    setForm((f) => {
      const models = [...f.models];
      const current = models[index];
      const nextPopular = !current.isPopular;
      const popularCount = models.filter((m) => m.isPopular).length;
      models[index] = {
        ...current,
        isPopular: nextPopular,
        popularOrder: nextPopular ? (current.popularOrder || popularCount + 1) : 0,
      };
      return { ...f, models };
    });
  }

  function saveModelFromModal() {
    if (!modelDraft?.name?.trim()) {
      toast.error("Model name is required");
      return;
    }
    const row = {
      ...modelDraft,
      slug: resolveModelSlugForSave(modelDraft),
      popularAccessories: modelDraft.popularAccessoriesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const nextModels =
      modelEditIndex == null
        ? [...form.models, row]
        : form.models.map((m, i) => (i === modelEditIndex ? row : m));
    const conflicts = findDuplicateModelSlugs(nextModels);
    if (conflicts.length) {
      toast.error(
        `This model conflicts with an existing one. Use a different nickname or generation (e.g. “City Classic” vs “City 2021+”).`
      );
      return;
    }
    setForm((f) => ({ ...f, models: nextModels }));
    setModelModal(false);
    setModelDraft(null);
  }

  async function deleteMake(id, name) {
    if (!window.confirm(`Delete make "${name}" and all its models?`)) return;
    try {
      const res = await fetch(`/api/car-catalog/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Deleted");
      setSelectedId(null);
      setForm(emptyMake());
      await load();
    } catch {
      toast.error("Network error");
    }
  }

  function moveMake(index, dir) {
    const sorted = [...makes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[index], sorted[j]] = [sorted[j], sorted[index]];
    Promise.all(
      sorted.map((m, order) =>
        fetch(`/api/car-catalog/${m._id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        })
      )
    ).then(() => load());
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading car catalog…</p>;
  }

  const sortedFiltered = filteredMakes;

  return (
    <div className="space-y-4">
      {modelModal ? (
        <ModelModal
          draft={modelDraft}
          setDraft={setModelDraft}
          onClose={() => {
            setModelModal(false);
            setModelDraft(null);
          }}
          onSave={saveModelFromModal}
          saving={false}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveMake}
          disabled={saving}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3 space-y-2">
            <button
              type="button"
              className="w-full rounded-lg border border-dashed py-2 text-sm font-medium"
              onClick={() => {
                setSelectedId(null);
                setForm(emptyMake());
              }}
            >
              + Add Make
            </button>
            <input
              type="search"
              placeholder="Search makes…"
              value={makeSearch}
              onChange={(e) => setMakeSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <ul className="max-h-[560px] overflow-y-auto p-2">
            {sortedFiltered.map((m, idx) => (
              <li key={m._id} className="mb-1">
                <div
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                    String(selectedId) === String(m._id) ? "bg-[var(--color-primary)]/10" : "hover:bg-slate-50"
                  }`}
                >
                  {m.logo ? (
                    <Image src={m.logo} alt="" width={28} height={28} className="rounded object-contain" unoptimized />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-xs font-bold">
                      {m.name.charAt(0)}
                    </span>
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(String(m._id))}>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-1 text-xs text-slate-400">
                      {COUNTRY_FLAGS[m.country] || "🌐"} {(m.models || []).length}
                    </span>
                  </button>
                  <button type="button" className="text-xs" onClick={() => moveMake(idx, -1)}>
                    ↑
                  </button>
                  <button type="button" className="text-xs" onClick={() => moveMake(idx, 1)}>
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">{form._id ? "Edit Make" : "New Make"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Make name</span>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Slug</span>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Country of origin</span>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="Japan"
              />
            </label>
          </div>
          <div className="mt-3 max-w-md">
            <CatalogImageField
              label="Make logo"
              value={form.logo}
              onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
              uploadFolder="storecraft/cars"
              previewMaxHeight={80}
            />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <h3 className="font-medium">Models</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                These cars appear as little cards on the homepage. Click{" "}
                <strong>Products</strong> to add or remove parts for that car,{" "}
                <strong>Mark popular</strong> to pin favorites, then{" "}
                <strong>Save Changes</strong>.
              </p>
            </div>
            <button type="button" className="text-sm text-[var(--color-primary)] font-semibold" onClick={() => openModelModal("new")}>
              + Add Model
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {form.models.map((model, i) => (
              <div key={model._id || i} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {model.image ? (
                    <Image src={model.image} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-slate-400">
                      {form.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{model.name || "Unnamed"}</p>
                    {model.isPopular ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        ⭐ Popular #{model.popularOrder || "—"}
                      </span>
                    ) : null}
                  </div>
                  {formatModelCardSubtitle(model) ? (
                    <p className="text-sm text-slate-700">{formatModelCardSubtitle(model)}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {model.yearFrom} – {model.yearTo} • {model.bodyStyle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleModelPopular(i)}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        model.isPopular
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {model.isPopular ? "⭐ Popular" : "☆ Mark popular"}
                    </button>
                    {model.isPopular ? (
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        Order
                        <input
                          type="number"
                          min={1}
                          className="w-14 rounded border border-slate-300 px-1 py-0.5"
                          value={model.popularOrder || ""}
                          onChange={(e) =>
                            updateModelAt(i, { popularOrder: Number(e.target.value) || 0 })
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="text-xs font-semibold text-[var(--color-primary)]" onClick={() => openModelModal(i)}>
                      Edit
                    </button>
                    {form._id && model._id ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#009688]"
                        onClick={() =>
                          setProductsPanel({
                            makeId: String(form._id),
                            modelId: String(model._id),
                            makeName: form.name,
                            modelName: model.name || "Model",
                          })
                        }
                      >
                        Products
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400" title="Save the make first">
                        Products (save first)
                      </span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setForm((f) => ({ ...f, models: f.models.filter((_, j) => j !== i) }))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {form._id ? (
            <button type="button" className="mt-6 text-sm text-red-600" onClick={() => deleteMake(form._id, form.name)}>
              Delete this make
            </button>
          ) : null}
        </div>
      </div>

      {productsPanel ? (
        <ModelProductsPanel
          makeId={productsPanel.makeId}
          modelId={productsPanel.modelId}
          makeName={productsPanel.makeName}
          modelName={productsPanel.modelName}
          onClose={() => setProductsPanel(null)}
        />
      ) : null}
    </div>
  );
}
