"use client";

import { ImageUploader } from "@/components/ui/ImageUploader";

/** ImageUploader may hand back a string, an object or an array — keep just the URL. */
function urlFrom(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();
  if (Array.isArray(payload)) return payload.length ? urlFrom(payload[0]) : "";
  if (typeof payload === "object") {
    const u = payload.url ?? payload.secure_url ?? payload.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

/**
 * "See it on your car" pictures for the storefront product page: one row per car,
 * each with a picture of this product fitted to that car.
 */
export default function OnCarPreviewsEditor({ value, onChange, fieldClass }) {
  const rows = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { car: "", vehicleSlug: "", image: "", aiGenerated: false }]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Pictures of this product fitted to specific cars. Customers tap &quot;See it on your car&quot; on
        the product page and pick their car. Rows without a car name and picture are not saved.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <input
              className={fieldClass}
              placeholder="Car, e.g. Toyota Corolla 2015-2024"
              value={row.car || ""}
              onChange={(e) => update(i, { car: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
          <input
            className={fieldClass}
            placeholder="Optional: car page link name, e.g. toyota-corolla-e170-2014-2026"
            value={row.vehicleSlug || ""}
            onChange={(e) => update(i, { vehicleSlug: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={row.aiGenerated === true}
              onChange={(e) => update(i, { aiGenerated: e.target.checked })}
            />
            AI-made picture (customers see an &quot;AI preview&quot; label)
          </label>
          <ImageUploader
            value={{ url: row.image || "", publicId: "" }}
            onChange={(img) => update(i, { image: urlFrom(img) })}
            uploadFolder="products"
            maxSizeMB={1}
            maxImageWidth={1200}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        + Add car picture
      </button>
    </div>
  );
}
