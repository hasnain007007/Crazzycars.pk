"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { processImageToWebp } from "@/lib/client/processImageToWebp";
import { FullScreenImageEditor } from "@/components/ui/FullScreenImageEditor";

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  );
}

async function uploadImageFile(file, { folder, maxWidth, maxSizeMB }) {
  const { blob, originalSize, finalSize, outputWidth, outputHeight } = await processImageToWebp(file, {
    maxWidth,
    skipResize: false,
    watermark: false,
    maxBytes: maxSizeMB * 1024 * 1024,
    quality: 0.9,
  });

  const fd = new FormData();
  fd.append("file", blob, "image.webp");
  fd.append("originalSize", String(originalSize));
  fd.append("finalSize", String(blob.size));
  fd.append("folder", folder);

  const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");

  return {
    url: json.data.url,
    publicId: json.data.publicId,
    originalSize: json.data.originalSize ?? originalSize,
    finalSize: json.data.finalSize ?? finalSize,
    width: outputWidth,
    height: outputHeight,
  };
}

/** Single brand asset (logo / favicon) with Replace, Edit and Remove controls. */
function BrandAsset({
  label,
  value,
  onChange,
  folder,
  maxWidth,
  maxSizeMB = 2,
  hint,
  previewBackground = "#ffffff",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const url = value?.url || "";

  const pickFile = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadImageFile(file, { folder, maxWidth, maxSizeMB });
      onChange({ ...uploaded, altText: value?.altText || "" });
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const replaceFromEditor = useCallback(
    async (_index, file) => {
      setBusy(true);
      try {
        const uploaded = await uploadImageFile(file, { folder, maxWidth, maxSizeMB });
        onChange({ ...uploaded, altText: value?.altText || "" });
      } catch (err) {
        toast.error(err.message || "Update failed");
      } finally {
        setBusy(false);
      }
    },
    [folder, maxWidth, maxSizeMB, onChange, value?.altText]
  );

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div
        className="flex h-[130px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ background: url ? previewBackground : "#f8fafc" }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} preview`} className="max-h-[110px] max-w-[85%] object-contain" />
        ) : (
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            className="text-sm font-medium text-slate-500 hover:text-[#1d6fb8] disabled:opacity-60 dark:text-slate-400"
          >
            {busy ? "Uploading…" : `+ Upload ${label.toLowerCase()}`}
          </button>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {busy ? "Working…" : url ? "Replace" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          disabled={!url || busy}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!url || busy}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/60 dark:bg-slate-800"
        >
          Remove
        </button>
      </div>

      {hint ? <p className="mt-2 text-[11px] text-slate-400">{hint}</p> : null}

      {editorOpen && url ? (
        <FullScreenImageEditor
          items={[{ url, publicId: value?.publicId || "", imageName: label, altText: value?.altText || "" }]}
          index={0}
          onClose={() => setEditorOpen(false)}
          onRemove={() => {
            onChange(null);
            setEditorOpen(false);
          }}
          replaceAtIndexWithFile={replaceFromEditor}
          onUpdateItem={(patch) => onChange({ ...(value || {}), ...patch })}
          galleryProcessing={busy}
        />
      ) : null}
    </div>
  );
}

/**
 * Branding card — store logo and favicon.
 * @param {{ general: object, onChange: (nextGeneral: object) => void }} props
 */
export function BrandingSettings({ general, onChange }) {
  const g = general || {};
  const logo = g.logo && typeof g.logo === "object" ? g.logo : { url: g.logoUrl || "", publicId: "" };
  const favicon =
    g.favicon && typeof g.favicon === "object" ? g.favicon : { url: g.faviconUrl || "", publicId: "" };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
          <GlobeIcon />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Branding</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Logo and favicon for your store</p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <BrandAsset
          label="Logo"
          value={logo}
          folder="storecraft/logo"
          maxWidth={800}
          maxSizeMB={2}
          previewBackground="#111111"
          hint="Recommended: PNG with transparent background. Displays at 220×72px on the storefront."
          onChange={(next) => {
            const img = next || { url: "", publicId: "" };
            onChange({ ...g, logo: img, logoUrl: img.url || "" });
          }}
        />
        <BrandAsset
          label="Favicon"
          value={favicon}
          folder="storecraft/favicon"
          maxWidth={512}
          maxSizeMB={1}
          hint="Square image, at least 96×96px. Shown in browser tabs, bookmarks and search results."
          onChange={(next) => {
            const img = next || { url: "", publicId: "" };
            onChange({ ...g, favicon: img, faviconUrl: img.url || "" });
          }}
        />
      </div>
    </div>
  );
}
