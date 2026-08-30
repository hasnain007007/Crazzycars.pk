/**
 * Full-page product create/edit form — single scrollable layout with sticky sidebar.
 */
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import { richTextPlainLength } from "@/lib/richTextPlain";
import { generateSlugFromProductName } from "@/lib/slugify";
import { toDatetimeLocalValue } from "@/lib/datetimeLocal";
import { isBodyKitProduct } from "@/lib/codEligibility";
import { getStorefrontBaseUrl } from "@/lib/storefrontUrl";
import { TabBasicInfo, CategoryPicker } from "./TabBasicInfo";
import { TabPricing } from "./TabPricing";
import { TabSettings } from "./TabSettings";
import TabMedia from "./TabMedia";
import { TabAddons } from "./TabAddons";
import { TabOptions } from "./TabOptions";
import { TabOrganisation } from "./TabOrganisation";
import TabVehicleFitment from "./TabVehicleFitment";
import {
  buildVehicleCompatibilityPayload,
  emptyVehicleCompatibility,
  vehicleCompatibilityFromProduct,
} from "@/lib/vehicleCompatibility";

const TabSEO = dynamic(() => import("./TabSEO").then((m) => ({ default: m.TabSEO })), {
  loading: () => <div className="py-6 text-center text-sm text-slate-500">Loading SEO…</div>,
});

const TabVariations = dynamic(() => import("./TabVariations"), {
  loading: () => <div className="py-6 text-center text-sm text-slate-500">Loading variations…</div>,
});

const VAR_TYPE_SET = new Set([
  "color",
  "size",
  "style",
  "material",
  "weight",
  "gauge",
  "height",
  "your-size",
  "available-options",
  "additional-size",
  "internal-diameter",
  "custom",
]);

const cardClass = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm";
const asideCardClass =
  "rounded-xl border border-gray-200 bg-white p-5 shadow-sm [&_.space-y-4]:space-y-4";

function scrollToSection(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function variantRowToForm(v) {
  const x = v || {};
  return {
    _id: x._id ? String(x._id) : "",
    combination: Array.isArray(x.combination) ? [...x.combination] : [],
    price: x.price === 0 ? 0 : x.price ?? "",
    compareAtPrice: x.compareAtPrice === 0 ? 0 : x.compareAtPrice ?? "",
    weight: x.weight === 0 ? 0 : x.weight ?? "",
    weightUnit: ["kg", "g", "lb", "oz"].includes(x.weightUnit) ? x.weightUnit : "g",
    additionalShippingWeight: x.additionalShippingWeight === 0 ? 0 : x.additionalShippingWeight ?? "",
    shippingPriceSurcharge: x.shippingPriceSurcharge === 0 ? 0 : x.shippingPriceSurcharge ?? "",
    stock: x.stock === 0 ? 0 : x.stock ?? "",
    sku: x.sku || "",
    trackStock: x.trackStock !== false,
    isAvailable: x.isAvailable !== false,
    image: x.image?.url
      ? {
          url: x.image.url,
          publicId: x.image.publicId || "",
          altText: x.image.altText || "",
          imageName: x.image.imageName || "",
          width: x.image.width,
          height: x.image.height,
        }
      : { url: "", publicId: "", altText: "", imageName: "", width: undefined, height: undefined },
  };
}

function variationOptionToForm(o) {
  if (typeof o === "string") {
    const t = String(o).trim();
    return {
      value: t,
      additionalPrice: "",
      weight: "",
      weightUnit: "g",
      additionalShippingWeight: "",
      shippingWeightUnit: "g",
      shippingPriceSurcharge: "",
      stock: "",
      sku: "",
    };
  }
  const x = o || {};
  return {
    value: x.value || "",
    additionalPrice: x.additionalPrice === 0 ? 0 : x.additionalPrice ?? "",
    weight: x.weight === 0 ? 0 : x.weight ?? "",
    weightUnit: ["kg", "g", "lb", "oz"].includes(x.weightUnit) ? x.weightUnit : "g",
    additionalShippingWeight: x.additionalShippingWeight === 0 ? 0 : x.additionalShippingWeight ?? "",
    shippingWeightUnit: ["kg", "g", "lb", "oz"].includes(x.shippingWeightUnit)
      ? x.shippingWeightUnit
      : ["kg", "g", "lb", "oz"].includes(x.weightUnit)
        ? x.weightUnit
        : "g",
    shippingPriceSurcharge: x.shippingPriceSurcharge === 0 ? 0 : x.shippingPriceSurcharge ?? "",
    stock: x.stock === 0 ? 0 : x.stock ?? "",
    sku: x.sku || "",
  };
}

function emptyForm() {
  return {
    name: "",
    slug: "",
    articleNo: "",
    ean: "",
    categories: [],
    shortDescription: "",
    longDescription: "",
    pricing: {
      regularPrice: "",
      salePrice: "",
      costPerItem: "",
      saleSchedule: { enabled: false, startDate: "", endDate: "" },
    },
    inventory: {
      quantity: 0,
      lowStockThreshold: 5,
      weight: "",
      weightUnit: "g",
      sku: "",
      trackInventory: true,
      allowBackorder: false,
    },
    media: { images: [], videos: [], videoUrl: "", videoType: "" },
    variations: [],
    simpleVariations: [],
    variationCombinations: [],
    variationTypes: [],
    variationOptions: [],
    variants: [],
    customSizing: {
      enabled: false,
      title: "Enter Your Measurements",
      description: "Enter your measurements for a perfect fit",
      unit: "cm",
      fields: [],
    },
    addOns: [],
    recommendedProducts: [],
    features: [],
    specifications: [],
    seo: { metaTitle: "", metaDescription: "", metaKeywords: [] },
    status: "draft",
    featured: false,
    isDeal: false,
    newArrival: false,
    codEnabled: true,
    advancePercentRequired: 0,
    isUniversal: false,
    compatibleCars: [],
    vehicleCompatibility: emptyVehicleCompatibility(),
    productType: "",
    vendor: "",
    collections: [],
    tags: [],
  };
}

function setFormPath(prev, path, value) {
  const next = JSON.parse(JSON.stringify(prev));
  const keys = path.split(".");
  let o = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    else o[k] = { ...o[k] };
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
  return next;
}

function productToForm(p) {
  return {
    name: p.name || "",
    slug: p.slug || "",
    articleNo: p.articleNo || "",
    ean: p?.ean || "",
    categories: (p.categories || []).map((c) => String(typeof c === "object" ? c._id : c)),
    shortDescription: p.shortDescription || "",
    longDescription: p.longDescription || "",
    pricing: {
      regularPrice: p.pricing?.regularPrice ?? "",
      salePrice: p.pricing?.salePrice ?? "",
      costPerItem: p.pricing?.costPerItem ?? "",
      saleSchedule: {
        enabled: Boolean(p.pricing?.saleSchedule?.enabled),
        startDate: p.pricing?.saleSchedule?.startDate ? toDatetimeLocalValue(p.pricing.saleSchedule.startDate) : "",
        endDate: p.pricing?.saleSchedule?.endDate ? toDatetimeLocalValue(p.pricing.saleSchedule.endDate) : "",
      },
    },
    inventory: {
      quantity: p.inventory?.quantity ?? 0,
      lowStockThreshold: p.inventory?.lowStockThreshold ?? 5,
      weight: p.inventory?.weight ?? "",
      weightUnit: p.inventory?.weightUnit || "g",
      sku: p.inventory?.sku || "",
      trackInventory: p.inventory?.trackInventory !== false && p.inventory?.trackQuantity !== false,
      allowBackorder: p.inventory?.allowBackorder === true,
    },
    media: {
      images: (p.media?.images || []).map((img, index) => ({
        url: img.url || "",
        publicId: img.publicId || "",
        originalSize: img.originalSize,
        finalSize: img.finalSize,
        isMain: Boolean(img.isMain),
        altText: img.altText || "",
        imageName: img.imageName || "",
        width: img.width,
        height: img.height,
        focalPoint:
          img.focalPoint && Number.isFinite(Number(img.focalPoint.x)) && Number.isFinite(Number(img.focalPoint.y))
            ? { x: Number(img.focalPoint.x), y: Number(img.focalPoint.y) }
            : undefined,
        _localId: img._localId || img.publicId || `loaded-${index}-${String(img.url || "").slice(-24)}`,
      })),
      videoUrl: p.media?.videoUrl || "",
      videos: Array.isArray(p.media?.videos) ? p.media.videos : [],
      videoType: ["youtube", "mp4"].includes(p.media?.videoType) ? p.media.videoType : "",
    },
    variations: (p.variations || []).map((v) => ({
      _id: v._id ? String(v._id) : "",
      type: VAR_TYPE_SET.has(String(v.type || "").toLowerCase()) ? String(v.type).toLowerCase() : "custom",
      name: v.name || "",
      options: Array.isArray(v.options) ? v.options.map(variationOptionToForm) : [],
    })),
    simpleVariations: Array.isArray(p.simpleVariations) ? p.simpleVariations : [],
    variationCombinations: Array.isArray(p.variationCombinations) ? p.variationCombinations : [],
    variationTypes: (p.variationTypes || []).map((t, i) => ({
      _id: t._id ? String(t._id) : "",
      name: t.name || "",
      type: VAR_TYPE_SET.has(String(t.type || "").toLowerCase()) ? String(t.type).toLowerCase() : "custom",
      position: Number.isFinite(Number(t.position)) ? Number(t.position) : i + 1,
    })),
    variationOptions: (p.variationOptions || []).map((o, i) => ({
      _id: o._id ? String(o._id) : "",
      typeName: o.typeName || "",
      value: o.value || "",
      position: Number.isFinite(Number(o.position)) ? Number(o.position) : i + 1,
    })),
    variants: (p.variants || []).map(variantRowToForm),
    customSizing: {
      enabled: Boolean(p.customSizing?.enabled),
      title: p.customSizing?.title || "Enter Your Measurements",
      description: p.customSizing?.description || "Enter your measurements for a perfect fit",
      unit: ["cm", "inches", "both"].includes(p.customSizing?.unit) ? p.customSizing.unit : "cm",
      fields: Array.isArray(p.customSizing?.fields)
        ? p.customSizing.fields.map((f) => ({
            fieldName: f.fieldName || "",
            label: f.label || "",
            placeholder: f.placeholder || "",
            required: f.required !== false,
            minValue: f.minValue ?? "",
            maxValue: f.maxValue ?? "",
            helpText: f.helpText || "",
          }))
        : [],
    },
    addOns: (p.addOns || []).map((a) => ({
      name: a.name || "",
      price: a.price ?? 0,
      required: Boolean(a.required),
    })),
    recommendedProducts: (p.recommendedProducts || [])
      .map((rp) => {
        if (rp && typeof rp === "object" && (rp.name || rp.slug)) {
          const imgs = rp.media?.images || [];
          const main = imgs.find((i) => i?.isMain) || imgs[0];
          return {
            _id: String(rp._id || rp.id),
            name: rp.name || "",
            slug: rp.slug || "",
            image: main?.url || "",
            status: rp.status || "",
          };
        }
        const id = String(rp?._id || rp || "").trim();
        return id ? { _id: id, name: "", slug: "", image: "", status: "" } : null;
      })
      .filter(Boolean),
    features: p.features?.length ? [...p.features] : [],
    specifications: Array.isArray(p.specifications) ? p.specifications.map((s) => ({ label: s.label || "", value: s.value || "" })) : [],
    seo: {
      metaTitle: p.seo?.metaTitle || "",
      metaDescription: p.seo?.metaDescription || "",
      metaKeywords: normalizeMetaKeywords(p.seo?.metaKeywords),
    },
    status: p.status || "draft",
    featured: Boolean(p.featured || p.isFeatured),
    isDeal: Boolean(p.isDeal),
    newArrival: Boolean(p.newArrival),
    codEnabled: p.codEnabled !== false,
    advancePercentRequired: Math.min(100, Math.max(0, Number(p.advancePercentRequired) || 0)),
    ...(() => {
      const fit = vehicleCompatibilityFromProduct(p);
      const synced = buildVehicleCompatibilityPayload(fit);
      return {
        vehicleCompatibility: fit,
        isUniversal: synced.isUniversal,
        compatibleCars: synced.compatibleCars,
      };
    })(),
    productType: p.productType || "",
    vendor: p.vendor || "",
    collections: Array.isArray(p.collections) ? [...p.collections] : [],
    tags: Array.isArray(p.tags) ? [...p.tags] : [],
  };
}

function buildApiPayload(form) {
  const regularPrice = Number(form.pricing.regularPrice);
  const saleRaw = form.pricing.salePrice;
  const costRaw = form.pricing.costPerItem;
  const slugTrimmed = String(form.slug || "").trim();
  const slugFinal = slugTrimmed || generateSlugFromProductName(form.name || "") || undefined;
  return {
    name: form.name.trim(),
    slug: slugFinal,
    articleNo: form.articleNo.trim(),
    ean: form.ean || "",
    categories: form.categories,
    shortDescription: form.shortDescription,
    longDescription: form.longDescription,
    pricing: {
      regularPrice,
      salePrice: saleRaw === "" || saleRaw === null || saleRaw === undefined ? null : Number(saleRaw),
      costPerItem:
        costRaw === "" || costRaw === null || costRaw === undefined ? 0 : Math.max(0, Number(costRaw) || 0),
      saleSchedule: {
        enabled: Boolean(form.pricing.saleSchedule?.enabled),
        startDate:
          form.pricing.saleSchedule?.enabled && form.pricing.saleSchedule?.startDate
            ? new Date(form.pricing.saleSchedule.startDate).toISOString()
            : null,
        endDate:
          form.pricing.saleSchedule?.enabled && form.pricing.saleSchedule?.endDate
            ? new Date(form.pricing.saleSchedule.endDate).toISOString()
            : null,
      },
    },
    inventory: {
      quantity: Math.max(0, Number(form.inventory.quantity) || 0),
      stock: Math.max(0, Number(form.inventory.quantity) || 0),
      stockQuantity: Math.max(0, Number(form.inventory.quantity) || 0),
      lowStockThreshold: Math.max(0, Number(form.inventory.lowStockThreshold) || 0),
      weight: form.inventory.weight === "" ? undefined : Number(form.inventory.weight),
      weightUnit: form.inventory.weightUnit || "g",
      sku: form.inventory.sku.trim(),
      trackInventory: form.inventory.trackInventory,
      trackQuantity: form.inventory.trackInventory,
      allowBackorder: form.inventory.allowBackorder === true,
    },
    media: {
      images: (form.media.images || []).map((img) => ({
        ...img,
        altText: img.altText || form.name || "Product image",
        imageName: img.imageName || form.name || "",
      })),
      videos: Array.isArray(form.media.videos) ? form.media.videos : [],
      videoUrl: String(form.media.videoUrl || "").trim(),
      videoType: ["youtube", "mp4"].includes(form.media.videoType) ? form.media.videoType : "",
    },
    variations: form.variations,
    simpleVariations: form.simpleVariations,
    variationCombinations: form.variationCombinations,
    variationTypes: form.variationTypes,
    variationOptions: form.variationOptions,
    variants: form.variants,
    customSizing: {
      enabled: Boolean(form.customSizing?.enabled),
      title: String(form.customSizing?.title || "Enter Your Measurements").trim(),
      description: String(form.customSizing?.description || "Enter your measurements for a perfect fit").trim(),
      unit: ["cm", "inches", "both"].includes(form.customSizing?.unit) ? form.customSizing.unit : "cm",
      fields: Array.isArray(form.customSizing?.fields)
        ? form.customSizing.fields
            .map((f) => ({
              fieldName: String(f?.fieldName || "").trim(),
              label: String(f?.label || "").trim(),
              placeholder: String(f?.placeholder || "").trim(),
              required: f?.required !== false,
              minValue: f?.minValue === "" || f?.minValue == null ? undefined : Number(f.minValue),
              maxValue: f?.maxValue === "" || f?.maxValue == null ? undefined : Number(f.maxValue),
              helpText: String(f?.helpText || "").trim(),
            }))
            .filter((f) => f.fieldName && f.label)
        : [],
    },
    addOns: form.addOns.filter((a) => a.name?.trim()),
    recommendedProducts: (form.recommendedProducts || [])
      .map((p) => String(p?._id || p?.id || p || "").trim())
      .filter(Boolean),
    features: form.features.map((f) => f.trim()).filter(Boolean),
    specifications: (form.specifications || []).filter((s) => s.label?.trim() && s.value?.trim()),
    seo: form.seo,
    status: form.status,
    featured: form.featured,
    isDeal: Boolean(form.isDeal),
    newArrival: form.newArrival,
    codEnabled: form.codEnabled !== false,
    advancePercentRequired: Math.min(100, Math.max(0, Number(form.advancePercentRequired) || 0)),
    ...buildVehicleCompatibilityPayload(form.vehicleCompatibility || emptyVehicleCompatibility()),
    productType: String(form.productType || "").trim(),
    vendor: String(form.vendor || "").trim(),
    collections: Array.isArray(form.collections) ? form.collections.map((s) => String(s || "").trim()).filter(Boolean) : [],
    tags: Array.isArray(form.tags) ? form.tags.map((s) => String(s || "").trim()).filter(Boolean) : [],
  };
}

export function ProductEditor({ mode, productId }) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(() => emptyForm());
  const [slugManual, setSlugManual] = useState(false);
  const [slugWarning, setSlugWarning] = useState("");
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadWatermarkEnabled, setUploadWatermarkEnabled] = useState(false);
  const [mediaEditorContext, setMediaEditorContext] = useState(() => ({
    usedInProducts: 1,
    addedAtLabel: mode === "edit" ? "—" : "Not saved yet",
  }));
  const autosaveReadyRef = useRef(false);
  const autosaveLastPayloadRef = useRef("");
  const autosaveTimerRef = useRef(null);
  const slugManualRef = useRef(slugManual);
  slugManualRef.current = slugManual;

  const handleProductNameChange = useCallback((newName) => {
    setForm((prev) => {
      if (!slugManualRef.current) {
        const autoSlug = generateSlugFromProductName(newName);
        return { ...prev, name: newName, slug: autoSlug };
      }
      return { ...prev, name: newName };
    });
  }, []);

  const updateFormData = useCallback((path, value) => {
    setForm((prev) => setFormPath(prev, path, value));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories?page=1&limit=500", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success) setCategories(json.data || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) setSlugManual(false);
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !productId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadError("");
        const res = await fetch(`/api/products/${productId}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Product not found");
        if (!cancelled) {
          const loadedForm = productToForm(json.data);
          setForm(loadedForm);
          autosaveLastPayloadRef.current = JSON.stringify(buildApiPayload(loadedForm));
          autosaveReadyRef.current = true;
          const derivedFromTitle = generateSlugFromProductName(loadedForm.name || "").trim();
          const loadedSlug = String(loadedForm.slug || "").trim();
          setSlugManual(
            Boolean(loadedSlug && derivedFromTitle && loadedSlug !== derivedFromTitle)
          );
          const ca = json.data?.createdAt;
          setMediaEditorContext({
            usedInProducts: 1,
            addedAtLabel: ca ? new Date(ca).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—",
          });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e.message || "Failed to load product";
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId]);

  useEffect(() => {
    if (!isEdit || !productId || loading || saving || deleting) return;
    if (!autosaveReadyRef.current) return;

    const payload = buildApiPayload(form);
    const signature = JSON.stringify(payload);
    if (signature === autosaveLastPayloadRef.current) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setAutoSaveState("saving");
      try {
        const res = await fetch(`/api/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setAutoSaveState("error");
          if (json.error) toast.error(String(json.error));
          return;
        }
        autosaveLastPayloadRef.current = signature;
        if (json.data?.slug && json.data.slug !== form.slug) {
          setForm((prev) => ({ ...prev, slug: json.data.slug }));
        }
        setAutoSaveState("saved");
        setTimeout(() => setAutoSaveState("idle"), 1200);
      } catch {
        setAutoSaveState("error");
      }
    }, 1100);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [deleting, form, isEdit, loading, productId, saving]);

  const displaySlug = form.slug?.trim() || generateSlugFromProductName(form.name) || "product-name";

  const checkSlugAvailability = useCallback(async () => {
    const raw = String(form.slug || displaySlug || "").trim();
    if (!raw) return;
    try {
      const params = new URLSearchParams({ slug: raw });
      if (isEdit && productId) params.set("excludeId", String(productId));
      const res = await fetch(`/api/products/check-slug?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) return;
      if (json.available) {
        setSlugWarning("");
        return;
      }
      if (json.suggestion && json.suggestion !== raw) {
        setForm((f) => ({ ...f, slug: json.suggestion }));
        setSlugWarning(`⚠ Slug already in use, will be saved as: ${json.suggestion}`);
      }
    } catch {
      /* ignore */
    }
  }, [displaySlug, form.slug, isEdit, productId]);

  const storeBase = getStorefrontBaseUrl();
  const previewUrl = `${storeBase}/${displaySlug}`;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      scrollToSection("product-section-basic");
      return;
    }
    if (richTextPlainLength(form.shortDescription) > 300) {
      toast.error("Short description must be 300 characters or less (plain text).");
      scrollToSection("product-section-basic");
      return;
    }
    const rp = Number(form.pricing.regularPrice);
    if (!Number.isFinite(rp) || rp < 0) {
      toast.error("Valid regular price is required");
      scrollToSection("product-section-options");
      return;
    }
    if (form.pricing?.saleSchedule?.enabled) {
      const { startDate, endDate } = form.pricing.saleSchedule;
      if (!startDate || !endDate) {
        toast.error("Set both sale start and end when scheduling a sale.");
        scrollToSection("product-section-options");
        return;
      }
      if (new Date(startDate) >= new Date(endDate)) {
        toast.error("Sale end must be after sale start.");
        scrollToSection("product-section-options");
        return;
      }
    }
    if (!form.articleNo || !String(form.articleNo).trim()) {
      toast.error("Article No is required before listing the product");
      document.getElementById("articleNo")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    setSaveOk(false);
    const payload = buildApiPayload(form);
    try {
      if (!isEdit) {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
        toast.success("Product saved!");
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2000);
        const id = json.data?._id;
        if (id) router.push(`/catalog/products/${id}`);
        else router.push("/catalog/products");
        router.refresh();
        return;
      }
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success("Product saved!");
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      if (json.data) setForm(productToForm(json.data));
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Product deleted");
      router.push("/catalog/products");
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const fieldClass =
    "h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2";

  const statusButtons = [
    { id: "active", label: "Active" },
    { id: "draft", label: "Draft" },
    { id: "inactive", label: "Inactive" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-[#111827]">Product not found</h1>
        <p className="mt-2 text-sm text-[#6b7280]">{loadError}</p>
        <Link
          href="/catalog/products"
          className="mt-6 inline-flex rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-16">
      <div className="mb-6">
        <Link href="/catalog/products" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          ← Back to Products
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">{isEdit ? "Edit product" : "New product"}</h1>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col space-y-6">
          <section id="product-section-basic" className={cardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Basic Information</h2>
            <div className="space-y-4">
              <TabBasicInfo
                key={isEdit && productId ? String(productId) : "new"}
                form={form}
                setForm={setForm}
                onProductNameChange={handleProductNameChange}
                categories={categories}
                slugManual={slugManual}
                setSlugManual={setSlugManual}
                slugWarning={slugWarning}
                onSlugBlur={checkSlugAvailability}
                productId={isEdit ? productId : undefined}
                clearSlugWarning={() => setSlugWarning("")}
              />
            </div>
          </section>

          <section id="product-section-fitment" className={cardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Vehicle Fitment 🚗</h2>
            <TabVehicleFitment
              value={form.vehicleCompatibility}
              onChange={(vehicleCompatibility) => {
                const payload = buildVehicleCompatibilityPayload(vehicleCompatibility);
                setForm((f) => ({
                  ...f,
                  // Keep editor rows (incl. empty drafts + stable _rowId)
                  vehicleCompatibility,
                  isUniversal: payload.isUniversal,
                  compatibleCars: payload.compatibleCars,
                }));
              }}
            />
          </section>

          <section id="product-section-seo" className={cardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">SEO Settings</h2>
            <div className="space-y-4">
              <TabSEO form={form} updateFormData={updateFormData} previewUrl={previewUrl} staticCard />
            </div>
          </section>

          <section id="product-section-variations" className={cardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Variations</h2>
            <div className="space-y-4">
              <TabVariations form={form} setForm={setForm} fieldClass={fieldClass} />
            </div>
          </section>

          <section id="product-section-addons" className={cardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Recommended products &amp; add-ons</h2>
            <div className="space-y-4">
              <TabAddons
                form={form}
                setForm={setForm}
                fieldClass={fieldClass}
                excludeProductId={isEdit ? productId : ""}
              />
            </div>
          </section>

          <section id="product-section-specifications" className={cardClass}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 className="text-base font-semibold text-gray-900" style={{ margin: 0 }}>Features &amp; Specifications</h2>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, specifications: [...(f.specifications || []), { label: "", value: "" }] }))}
                style={{ padding: "6px 14px", background: "#009688", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                + Add Spec
              </button>
            </div>
            {(!form.specifications || form.specifications.length === 0) ? (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, textAlign: "center", padding: "16px 0" }}>
                No specifications added yet. Click &quot;+ Add Spec&quot; to add.
              </p>
            ) : null}
            {(form.specifications || []).map((spec, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 10, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Label (e.g. Weight)"
                  value={spec.label}
                  onChange={(e) => {
                    const specs = [...(form.specifications || [])];
                    specs[index] = { ...specs[index], label: e.target.value };
                    setForm((f) => ({ ...f, specifications: specs }));
                  }}
                  className={fieldClass}
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 300g)"
                  value={spec.value}
                  onChange={(e) => {
                    const specs = [...(form.specifications || [])];
                    specs[index] = { ...specs[index], value: e.target.value };
                    setForm((f) => ({ ...f, specifications: specs }));
                  }}
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, specifications: (f.specifications || []).filter((_, i) => i !== index) }))}
                  style={{ width: 32, height: 32, background: "#fee2e2", border: "none", borderRadius: 6, color: "#dc2626", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </section>
        </div>

        <aside className="order-first flex w-full shrink-0 flex-col space-y-6 xl:order-none xl:sticky xl:top-[72px] xl:max-h-[calc(100vh-90px)] xl:min-w-[320px] xl:max-w-[380px] xl:self-start xl:overflow-y-auto xl:[scrollbar-width:thin] xl:[scrollbar-color:rgb(156_163_175)_transparent]">
          <div className={asideCardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Save</h2>
            <div className="space-y-4">
            {isEdit ? (
              <p className="text-xs text-gray-500">
                {autoSaveState === "saving"
                  ? "Auto-saving..."
                  : autoSaveState === "saved"
                    ? "Auto-saved"
                    : autoSaveState === "error"
                      ? "Autosave failed (you can still click Save Product)"
                      : "Autosave is on"}
              </p>
            ) : null}
            <p className="text-xs font-medium text-gray-600">Product status</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {statusButtons.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s.id }))}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    form.status === s.id
                      ? "border-[#1d6fb8] bg-[#eff6ff] text-[#1d4ed8]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d6fb8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#185f9e] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : saveOk ? (
                <>
                  <span className="text-emerald-200">✓</span> Saved
                </>
              ) : (
                "Save Product"
              )}
            </button>
            {isEdit ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="mt-4 w-full text-center text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
              >
                Delete
              </button>
            ) : null}
            </div>
          </div>

          <section className={asideCardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Media</h2>
            <div className="space-y-4">
              <TabMedia
                value={form.media.images}
                onChange={(images) => updateFormData("media", { ...form.media, images })}
                enableWatermark
                multiple
                maxSizeMB={1}
                maxImageWidth={1200}
                uploadFolder="products"
                itemName={form.name || ""}
                existingImageCount={(form.media.images || []).length}
                watermarkEnabled={uploadWatermarkEnabled}
                onWatermarkEnabledChange={setUploadWatermarkEnabled}
                hideWatermarkToolbar
                editorUsageContext={mediaEditorContext}
                videos={form.media.videos || []}
                onVideosChange={(videos) => updateFormData("media", { ...form.media, videos })}
                videoUrl={form.media.videoUrl || ""}
                videoType={form.media.videoType || ""}
                onVideoChange={({ videoUrl, videoType }) =>
                  updateFormData("media", { ...form.media, videoUrl, videoType })
                }
              />
            </div>
          </section>

          <section id="product-section-options" className={asideCardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Options</h2>
            <div className="space-y-4">
              <TabOptions
                form={form}
                setForm={setForm}
                updateFormData={updateFormData}
                fieldClass={fieldClass}
                watermarkEnabled={uploadWatermarkEnabled}
                onWatermarkEnabledChange={setUploadWatermarkEnabled}
              />
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <TabPricing form={form} updateFormData={updateFormData} />
              </div>
            </div>
          </section>

          <div className={`${asideCardClass} xl:pb-4`}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Organisation</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Categories</label>
                <CategoryPicker
                  options={categories}
                  value={form.categories}
                  onChange={(v) => setForm((f) => ({ ...f, categories: v }))}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Featured Product</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Show in Best Sellers section on homepage</p>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 44,
                    height: 24,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.featured || false}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: form.featured ? "#009688" : "#d1d5db",
                      borderRadius: 99,
                      transition: "background 0.2s",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: form.featured ? 22 : 2,
                      width: 20,
                      height: 20,
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Hot Deal</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Show in Hot Deals section on homepage</p>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 44,
                    height: 24,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isDeal || false}
                    onChange={(e) => setForm((f) => ({ ...f, isDeal: e.target.checked }))}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: form.isDeal ? "#C41E1E" : "#d1d5db",
                      borderRadius: 99,
                      transition: "background 0.2s",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: form.isDeal ? 22 : 2,
                      width: 20,
                      height: 20,
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={form.newArrival}
                  onChange={(e) => setForm((f) => ({ ...f, newArrival: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1d6fb8] focus:ring-[#1d6fb8]"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">New arrival</span>
                  <span className="text-xs text-gray-500">Mark as new arrival for 30 days.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={isBodyKitProduct(form) ? false : form.codEnabled !== false}
                  disabled={isBodyKitProduct(form)}
                  onChange={(e) => setForm((f) => ({ ...f, codEnabled: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1d6fb8] focus:ring-[#1d6fb8]"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Cash on Delivery (COD)</span>
                  <span className="text-xs text-gray-500">
                    {isBodyKitProduct(form)
                      ? "Body kits cannot be sold on COD. Checkout will only offer JazzCash, Meezan, or bank transfer."
                      : "Allow COD at checkout when this product is in the cart. Turn off for prepaid-only items."}
                  </span>
                </span>
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="block text-sm font-semibold text-gray-900">Advance payment required</label>
                <p className="mt-0.5 text-xs text-gray-500">
                  Customer must pay at least this % of the item total before dispatch (e.g. 50%).
                </p>
                <select
                  value={String(form.advancePercentRequired || 0)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      advancePercentRequired: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900"
                >
                  <option value="0">None</option>
                  <option value="25">Pay at least 25% advance</option>
                  <option value="50">Pay at least 50% advance</option>
                  <option value="75">Pay at least 75% advance</option>
                  <option value="100">Pay 100% in advance</option>
                </select>
              </div>
            </div>
          </div>

          <section className={asideCardClass}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Product Organisation</h2>
            <div className="space-y-4">
              <TabOrganisation form={form} setForm={setForm} fieldClass={fieldClass} />
            </div>
          </section>

          <div className="mt-auto flex flex-col space-y-6 pb-2">
            <TabSettings
              form={form}
              setForm={setForm}
              storeUrl={storeBase}
              displaySlug={displaySlug}
              asideCardClass={asideCardClass}
            />
          </div>
        </aside>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setDeleteOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111827]">Delete product?</h3>
            <p className="mt-2 text-sm text-[#6b7280]">This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
