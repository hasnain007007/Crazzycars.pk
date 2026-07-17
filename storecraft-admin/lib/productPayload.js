/**
 * Normalize variation / add-on arrays from API requests.
 */
import mongoose from "mongoose";
import { mergeVariantsPreserveIds } from "@/lib/variantMatrix";
import { normalizeVariationOptionEntry, optionLegacySpread } from "@/lib/variationOptions";

export function normalizeVariations(raw) {
  if (!Array.isArray(raw)) return [];
  const normalizeType = (input) => {
    const v = String(input || "").trim().toLowerCase();
    if (
      [
        "color",
        "size",
        "gauge",
        "height",
        "your-size",
        "available-options",
        "additional-size",
        "internal-diameter",
        "custom",
      ].includes(v)
    ) {
      return v;
    }
    if (["colour"].includes(v)) return "color";
    return "custom";
  };
  return raw.map((v) => {
    const rawOpts = Array.isArray(v?.options) ? v.options : [];
    const allStrings = rawOpts.length > 0 && rawOpts.every((o) => typeof o === "string");
    const legacy = optionLegacySpread(v);

    const options = rawOpts
      .map((o) => {
        const row = normalizeVariationOptionEntry(o);
        if (!row) return null;
        if (allStrings) {
          const migrated = {
            value: row.value,
            additionalPrice: legacy.legacyExtra,
            weight: legacy.legacyW,
            weightUnit: legacy.legacyWUnit,
            additionalShippingWeight: legacy.legacyShip,
            shippingWeightUnit: legacy.legacyShipUnit,
            shippingPriceSurcharge: legacy.legacySur,
            sku: "",
          };
          if (legacy.legacyStock > 0) migrated.stock = legacy.legacyStock;
          return migrated;
        }
        return row;
      })
      .filter(Boolean)
      .filter((row) => row.value);

    const parseVariationSubId = (row) => {
      const raw = row?._id ?? row?.id;
      const s = raw == null ? "" : String(raw).trim();
      return /^[a-fA-F0-9]{24}$/.test(s) ? s : null;
    };

    const base = {
      type: normalizeType(v?.type),
      name: String(v?.name || "").trim(),
      options,
      additionalPrice: Number(v?.additionalPrice ?? v?.extraPrice) || 0,
      quantity: Number(v?.quantity ?? v?.stock) || 0,
    };
    const vid = parseVariationSubId(v);
    return vid ? { ...base, _id: vid } : base;
  });
}

export function normalizeAddOns(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => ({
    name: String(a?.name || "").trim(),
    price: Number(a?.price) || 0,
    required: Boolean(a?.required),
  }));
}

const WEIGHT_UNITS = new Set(["kg", "g", "lb", "oz"]);

function parseSubDocumentId(row) {
  const id = row?._id ?? row?.id;
  const s = id == null ? "" : String(id).trim();
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null;
}

function normalizeVariationKind(input) {
  const v = String(input || "").trim().toLowerCase();
  if (
    [
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
    ].includes(v)
  ) {
    return v;
  }
  if (["colour"].includes(v)) return "color";
  return "custom";
}

export function normalizeVariationTypes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t, i) => {
      const base = {
        name: String(t?.name || "").trim(),
        type: normalizeVariationKind(t?.type),
        position: Number.isFinite(Number(t?.position)) ? Number(t.position) : i + 1,
      };
      if (!base.name) return null;
      const id = parseSubDocumentId(t);
      return id ? { ...base, _id: id } : base;
    })
    .filter(Boolean);
}

export function normalizeVariationOptions(raw, typeNames) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(
    (Array.isArray(typeNames) ? typeNames : []).map((s) => String(s || "").trim()).filter(Boolean)
  );
  if (!allowed.size) return [];
  return raw
    .map((o, i) => {
      const base = {
        typeName: String(o?.typeName || "").trim(),
        value: String(o?.value || "").trim(),
        position: Number.isFinite(Number(o?.position)) ? Number(o.position) : i + 1,
      };
      if (!base.typeName || !base.value || !allowed.has(base.typeName)) return null;
      const id = parseSubDocumentId(o);
      return id ? { ...base, _id: id } : base;
    })
    .filter(Boolean);
}

export function normalizeProductVariants(raw, defaults = {}) {
  if (!Array.isArray(raw)) return [];
  const defPrice = Math.max(0, Number(defaults.regularPrice) || 0);
  const defCompare = Math.max(0, Number(defaults.compareAtPrice) || defPrice);
  return raw
    .map((v) => {
      const combination = Array.isArray(v?.combination)
        ? v.combination.map((x) => String(x ?? "").trim()).filter(Boolean)
        : [];
      if (!combination.length) return null;
      const wu = WEIGHT_UNITS.has(String(v?.weightUnit || "").toLowerCase())
        ? String(v.weightUnit).toLowerCase()
        : "g";
      const img = v?.image;
      const image =
        img && typeof img === "object" && String(img.url || "").trim()
          ? { url: String(img.url).trim(), publicId: String(img.publicId || "").trim() }
          : undefined;
      const row = {
        combination,
        price: Math.max(0, Number(v?.price) || defPrice),
        compareAtPrice: Math.max(0, Number(v?.compareAtPrice) || defCompare),
        weight: Math.max(0, Number(v?.weight) || 0),
        weightUnit: wu,
        additionalShippingWeight: Math.max(0, Number(v?.additionalShippingWeight) || 0),
        shippingPriceSurcharge: Math.max(0, Number(v?.shippingPriceSurcharge) || 0),
        stock: Math.max(0, Number(v?.stock) || 0),
        sku: String(v?.sku || "").trim(),
        trackStock: v?.trackStock !== false,
        isAvailable: v?.isAvailable !== false,
        ...(image ? { image } : {}),
      };
      const vid = parseSubDocumentId(v);
      return vid ? { ...row, _id: vid } : row;
    })
    .filter(Boolean);
}

export function mergeVariantsWithExisting(incomingNormalized, existingDocVariants) {
  return mergeVariantsPreserveIds(incomingNormalized, existingDocVariants || []);
}

export function normalizeCustomSizing(raw) {
  const unit = ["cm", "inches", "both"].includes(raw?.unit) ? raw.unit : "cm";
  const asFiniteOrUndefined = (value) => {
    if (value === "" || value == null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const fields = Array.isArray(raw?.fields)
    ? raw.fields
        .map((f) => ({
          fieldName: String(f?.fieldName || "").trim(),
          label: String(f?.label || "").trim(),
          placeholder: String(f?.placeholder || "").trim(),
          required: f?.required !== false,
          minValue: asFiniteOrUndefined(f?.minValue),
          maxValue: asFiniteOrUndefined(f?.maxValue),
          helpText: String(f?.helpText || "").trim(),
        }))
        .filter((f) => f.fieldName && f.label)
    : [];
  return {
    enabled: Boolean(raw?.enabled),
    title: String(raw?.title || "Enter Your Measurements").trim(),
    description: String(raw?.description || "Enter your measurements for a perfect fit").trim(),
    unit,
    fields,
  };
}

export function normalizeMediaImageEntry(img) {
  const url = String(img?.url || "").trim();
  if (!url) return null;
  const w = Number(img?.width);
  const h = Number(img?.height);
  return {
    url,
    publicId: String(img?.publicId || "").trim(),
    originalSize: typeof img?.originalSize === "number" ? img.originalSize : undefined,
    finalSize: typeof img?.finalSize === "number" ? img.finalSize : undefined,
    isMain: Boolean(img?.isMain),
    altText: String(img?.altText || "").trim().slice(0, 500),
    imageName: String(img?.imageName || "").trim().slice(0, 200),
    width: Number.isFinite(w) && w > 0 ? Math.round(w) : undefined,
    height: Number.isFinite(h) && h > 0 ? Math.round(h) : undefined,
    focalPoint: (() => {
      const fx = Number(img?.focalPoint?.x);
      const fy = Number(img?.focalPoint?.y);
      if (!Number.isFinite(fx) || !Number.isFinite(fy)) return undefined;
      return {
        x: Math.min(100, Math.max(0, Math.round(fx * 10) / 10)),
        y: Math.min(100, Math.max(0, Math.round(fy * 10) / 10)),
      };
    })(),
  };
}

export function normalizeMediaImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMediaImageEntry).filter(Boolean);
}

export function normalizeMediaVideos(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((video) => {
      const url = String(video?.url || "").trim();
      if (!url) return null;
      return {
        url,
        originalUrl: String(video?.originalUrl || "").trim(),
        publicId: String(video?.publicId || "").trim(),
        thumbnail: String(video?.thumbnail || "").trim(),
        format: String(video?.format || "webm").trim() || "webm",
        duration: Math.max(0, Number(video?.duration) || 0),
        size: Math.max(0, Number(video?.size) || 0),
        width: Math.max(0, Number(video?.width) || 0),
        height: Math.max(0, Number(video?.height) || 0),
        title: String(video?.title || "").trim().slice(0, 200),
        isPrimary: Boolean(video?.isPrimary),
      };
    })
    .filter(Boolean);
}

/** Normalizes category ids from API payloads to Mongo ObjectIds (handles `{ _id }` shapes). */
export function normalizeProductCategoryIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => {
      const s =
        id != null && typeof id === "object" && id._id != null
          ? String(id._id).trim()
          : String(id ?? "").trim();
      return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
    })
    .filter(Boolean);
}

export function normalizeProductOrganisation(body) {
  const collections = Array.isArray(body?.collections)
    ? body.collections.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 50)
    : [];
  const tags = Array.isArray(body?.tags) ? body.tags.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 100) : [];
  return {
    productType: String(body?.productType ?? "").trim().slice(0, 120),
    vendor: String(body?.vendor ?? "").trim().slice(0, 200),
    collections,
    tags,
  };
}

const SIMPLE_VARIATION_KEYS = [
  "color",
  "size",
  "gauge",
  "height",
  "internalDiameter",
  "yourSize",
  "availableOptions",
  "additionalSize",
];

export function normalizeSimpleVariations(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  SIMPLE_VARIATION_KEYS.forEach((key) => {
    const item = src[key] && typeof src[key] === "object" ? src[key] : {};
    const values = Array.isArray(item.values)
      ? item.values.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    out[key] = {
      enabled: Boolean(item.enabled),
      values,
    };
  });
  return out;
}

export function normalizeVariationCombinations(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      color: String(row?.color || "").trim(),
      size: String(row?.size || "").trim(),
      gauge: String(row?.gauge || "").trim(),
      height: String(row?.height || "").trim(),
      internalDiameter: String(row?.internalDiameter || "").trim(),
      yourSize: String(row?.yourSize || "").trim(),
      availableOptions: String(row?.availableOptions || "").trim(),
      additionalSize: String(row?.additionalSize || "").trim(),
      price: Math.max(0, Number(row?.price) || 0),
      weight: Math.max(0, Number(row?.weight) || 0),
      stock: Math.max(0, Number(row?.stock) || 0),
      sku: String(row?.sku || "").trim(),
    }))
    .filter((row) =>
      SIMPLE_VARIATION_KEYS.some((k) => row[k]) ||
      row.price > 0 ||
      row.weight > 0 ||
      row.stock > 0 ||
      row.sku
    );
}
