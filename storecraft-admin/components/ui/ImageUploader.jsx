/**
 * Client-side WebP conversion + compression, then upload to /api/upload.
 */
"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { processImageToWebp } from "@/lib/client/processImageToWebp";
import { FullScreenImageEditor } from "@/components/ui/FullScreenImageEditor";
import { WatermarkCssOverlay } from "@/components/ui/WatermarkCssOverlay";

const SMALL_FILE_BYTES = 200 * 1024;
const WEBP_Q = 0.85;

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function pctSaved(orig, fin) {
  if (!orig || orig <= 0) return 0;
  return Math.round(((orig - fin) / orig) * 100);
}

/** Insert Cloudinary delivery transforms immediately after /upload/ (first occurrence only). */
function cloudinaryTransformUrl(url, { brightness = 0, contrast = 0 }) {
  if (!url || typeof url !== "string") return url;
  const parts = [];
  if (brightness)
    parts.push(`e_brightness:${Math.round(Math.max(-99, Math.min(99, Number(brightness) || 0)))}`);
  if (contrast) parts.push(`e_contrast:${Math.round(Math.max(-99, Math.min(99, Number(contrast) || 0)))}`);
  if (!parts.length) return url;
  const chain = parts.join(",");
  const idx = url.search(/\/upload\//i);
  if (idx === -1) return url;
  const at = idx + "/upload/".length;
  return `${url.slice(0, at)}${chain}/${url.slice(at)}`;
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const seg = decodeURIComponent(u.pathname.split("/").pop() || "image");
    return seg.split("?")[0] || "image.webp";
  } catch {
    return "image.webp";
  }
}

const STEP_IDS = ["read", "compress", "webp", "upload"];

function UploadIcon() {
  return (
    <svg className="mx-auto h-10 w-10 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1d6fb8] border-t-transparent" />;
}

function uploadErrorMessage(error) {
  const status = error?.status;
  if (status >= 500) {
    return "Upload failed. Please configure Cloudinary for production image uploads.";
  }
  const msg = String(error?.message || "").trim();
  if (/cloudinary credentials required in production/i.test(msg)) {
    return "Upload failed. Please configure Cloudinary for production image uploads.";
  }
  return msg || "Upload failed";
}

export function ImageUploader({
  value,
  onChange,
  multiple = false,
  maxSizeMB = 1,
  showControls = true,
  maxImageWidth = 1200,
  /** WebP encoder quality 0–1 (higher = sharper, larger files). */
  webpQuality = WEBP_Q,
  uploadFolder = "categories",
  enableWatermark = false,
  defaultWatermarkText = "",
  /** When set, watermark on/off is controlled by parent (e.g. product editor Options card). */
  watermarkEnabled: watermarkEnabledControlled,
  onWatermarkEnabledChange,
  /** Hide the built-in watermark checkbox UI (when controlled elsewhere). */
  hideWatermarkToolbar = false,
  /** Product media: larger grid, toolbars, crop/edit UI, upload queue. */
  galleryLayout = false,
  /** Passed to full-screen image editor (e.g. product usage, added date label). */
  editorUsageContext,
  /** Item name (e.g. product name) used for meaningful Cloudinary filenames. */
  itemName = "",
  /** Number of images already in the gallery — used to calculate upload index. */
  existingImageCount = 0,
  /** Storefront CSS watermark settings (preview only; not burned into uploads). */
  storefrontWatermark = null,
}) {
  const [watermarkEnabledInternal, setWatermarkEnabledInternal] = useState(false);
  const watermarkControlled = typeof watermarkEnabledControlled === "boolean";
  const watermarkEnabled = watermarkControlled ? watermarkEnabledControlled : watermarkEnabledInternal;
  const setWatermarkEnabled = (next) => {
    if (watermarkControlled) onWatermarkEnabledChange?.(next);
    else setWatermarkEnabledInternal(next);
  };
  const [watermarkText, setWatermarkText] = useState(
    () => defaultWatermarkText || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`
  );
  const [processing, setProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [doneSteps, setDoneSteps] = useState(() => new Set());
  const [uploadQueue, setUploadQueue] = useState([]);
  const [lastBatchSummary, setLastBatchSummary] = useState(null);
  const [cropModal, setCropModal] = useState(null);
  const [editPanelIndex, setEditPanelIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const revokeUrls = useRef(new Set());
  const valueRef = useRef(value);

  const maxBytes = maxSizeMB * 1024 * 1024;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const items = useMemo(() => (multiple && Array.isArray(value) ? value : []), [multiple, value]);
  const single = useMemo(() => {
    if (multiple) return null;
    return value && typeof value === "object" && value.url ? value : null;
  }, [multiple, value]);

  const addRevoke = (u) => {
    if (u?.startsWith("blob:")) revokeUrls.current.add(u);
  };

  useEffect(() => () => {
    revokeUrls.current.forEach((u) => URL.revokeObjectURL(u));
    revokeUrls.current.clear();
  }, []);

  const uploadBlob = useCallback(async (blob, originalSize, imageIndex = 1) => {
    const fd = new FormData();
    fd.append("file", blob, "image.webp");
    fd.append("originalSize", String(originalSize));
    fd.append("finalSize", String(blob.size));
    fd.append("folder", uploadFolder);
    if (itemName) fd.append("itemName", itemName);
    fd.append("imageIndex", String(imageIndex));
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const err = new Error(json.error || "Upload failed");
      err.status = res.status;
      throw err;
    }
    return json.data;
  }, [uploadFolder, itemName]);

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const processAndUpload = useCallback(
    async (file, imageIndex = 1) => {
      const skipResize = file.size < SMALL_FILE_BYTES;
      const wm = enableWatermark && watermarkEnabled ? watermarkText : "";
      console.log("Processing image with watermark settings:", {
        enableWatermark,
        watermarkEnabled,
        watermarkText,
        finalWatermark: enableWatermark && watermarkEnabled,
      });
      const stepUi = !galleryLayout;

      setProcessing(true);
      if (stepUi) {
        setDoneSteps(new Set());
        setCurrentStepIndex(0);
        await delay(40);
        setDoneSteps(new Set(["read"]));
        setCurrentStepIndex(1);
        await delay(40);
      }

      const { blob, originalSize, finalSize, previewUrl, outputWidth, outputHeight } = await processImageToWebp(file, {
        maxWidth: maxImageWidth,
        skipResize,
        watermark: Boolean(enableWatermark && watermarkEnabled),
        watermarkText: wm || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
        maxBytes,
        quality: Number.isFinite(webpQuality) ? Math.min(1, Math.max(0.5, webpQuality)) : WEBP_Q,
      });
      addRevoke(previewUrl);

      if (stepUi) {
        setDoneSteps(new Set(["read", "compress"]));
        setCurrentStepIndex(2);
        await delay(40);
        setDoneSteps(new Set(["read", "compress", "webp"]));
        setCurrentStepIndex(3);
        await delay(40);
      }

      const data = await uploadBlob(blob, originalSize, imageIndex);
      if (stepUi) {
        setDoneSteps(new Set(STEP_IDS));
        setCurrentStepIndex(-1);
      }
      setProcessing(false);

      const nm = String(file?.name || "image.webp").replace(/\.\w+$/, "").replace(/[/\\]/g, "-").slice(0, 200);
      const id = crypto.randomUUID();
      return {
        url: data.url,
        publicId: data.publicId,
        originalSize: data.originalSize ?? originalSize,
        finalSize: data.finalSize ?? finalSize,
        _localId: id,
        imageName: nm,
        altText: "",
        width: outputWidth,
        height: outputHeight,
      };
    },
    [enableWatermark, watermarkEnabled, watermarkText, maxImageWidth, maxBytes, webpQuality, uploadBlob, galleryLayout]
  );

  const replaceAtIndexWithFile = useCallback(
    async (index, file, opts = {}) => {
      try {
        const skipResize = file.size < SMALL_FILE_BYTES;
        const wm = enableWatermark && watermarkEnabled ? watermarkText : "";
        console.log("Processing image with watermark settings:", {
          enableWatermark,
          watermarkEnabled,
          watermarkText,
          finalWatermark: enableWatermark && watermarkEnabled,
        });
        setProcessing(true);
        const { blob, originalSize, finalSize, previewUrl, outputWidth, outputHeight } = await processImageToWebp(file, {
          maxWidth: maxImageWidth,
          skipResize,
          watermark: Boolean(enableWatermark && watermarkEnabled),
          watermarkText: wm || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
          maxBytes,
          quality: Number.isFinite(webpQuality) ? Math.min(1, Math.max(0.5, webpQuality)) : WEBP_Q,
        });
        addRevoke(previewUrl);
        const data = await uploadBlob(blob, originalSize, index + 1);
        const prev = Array.isArray(valueRef.current) ? [...valueRef.current] : [];
        if (index < 0 || index >= prev.length) return;
        prev[index] = {
          ...prev[index],
          url: data.url,
          publicId: data.publicId,
          originalSize: data.originalSize ?? originalSize,
          finalSize: data.finalSize ?? finalSize,
          width: outputWidth,
          height: outputHeight,
        };
        onChange(prev);
        valueRef.current = prev;
        if (!opts.silent) toast.success("Image updated.");
      } catch (e) {
        console.error(e);
        toast.error(uploadErrorMessage(e));
      } finally {
        setProcessing(false);
      }
    },
    [enableWatermark, watermarkEnabled, watermarkText, maxImageWidth, maxBytes, webpQuality, uploadBlob, onChange]
  );

  const onPickFiles = useCallback(
    async (acceptedFiles) => {
      const files = Array.from(acceptedFiles || []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;

      if (!multiple) {
        try {
          const r = await processAndUpload(files[0], 1);
          onChange({
            url: r.url,
            publicId: r.publicId,
            originalSize: r.originalSize,
            finalSize: r.finalSize,
            imageName: r.imageName,
            altText: r.altText || "",
            width: r.width,
            height: r.height,
          });
        } catch (e) {
          console.error(e);
          toast.error(uploadErrorMessage(e));
        }
        return;
      }

      let batchSaved = 0;
      for (const file of files) {
        const currentCount = Array.isArray(valueRef.current) ? valueRef.current.length : 0;
        const imageIndex = currentCount + 1;
        const qid = crypto.randomUUID();
        if (galleryLayout) {
          setUploadQueue((q) => [...q, { id: qid, name: file.name, progress: 8, status: "uploading" }]);
        }
        try {
          if (galleryLayout) {
            setUploadQueue((q) => q.map((x) => (x.id === qid ? { ...x, progress: 35 } : x)));
          }
          const r = await processAndUpload(file, imageIndex);
          batchSaved += Math.max(0, (Number(r.originalSize) || 0) - (Number(r.finalSize) || 0));
          if (galleryLayout) {
            setUploadQueue((q) => q.map((x) => (x.id === qid ? { ...x, progress: 100, status: "done" } : x)));
          }
          const prev = Array.isArray(valueRef.current) ? [...valueRef.current] : [];
          const next = [
            ...prev,
            {
              url: r.url,
              publicId: r.publicId,
              originalSize: r.originalSize,
              finalSize: r.finalSize,
              isMain: prev.length === 0,
              _localId: r._localId,
              imageName: r.imageName,
              altText: r.altText || "",
              width: r.width,
              height: r.height,
            },
          ];
          if (prev.length === 0) next[0].isMain = true;
          valueRef.current = next;
          onChange(next);
        } catch (e) {
          console.error(e);
          if (galleryLayout) {
            setUploadQueue((q) => q.map((x) => (x.id === qid ? { ...x, status: "error", progress: 0 } : x)));
          }
          toast.error(uploadErrorMessage(e));
        }
      }
      if (galleryLayout && files.length) {
        setLastBatchSummary({ count: files.length, savedBytes: batchSaved });
        setTimeout(() => setUploadQueue([]), 4500);
        setTimeout(() => setLastBatchSummary(null), 9000);
      }
    },
    [multiple, onChange, processAndUpload, galleryLayout]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onPickFiles,
    accept: { "image/*": [] },
    multiple,
    disabled: processing,
  });

  const removeAt = (index) => {
    if (galleryLayout && multiple) {
      if (!window.confirm("Remove this image from the product?")) return;
    }
    if (!multiple) {
      onChange(null);
      return;
    }
    const prev = Array.isArray(value) ? [...value] : [];
    const removed = prev[index];
    prev.splice(index, 1);
    if (removed?.isMain && prev.length) prev[0].isMain = true;
    onChange(prev);
  };

  const setMainAt = (index) => {
    if (!multiple) return;
    const prev = Array.isArray(value) ? [...value] : [];
    prev.forEach((it, i) => {
      it.isMain = i === index;
    });
    onChange(prev);
  };

  const onDragEnd = (result) => {
    if (!result.destination || !multiple) return;
    if (result.destination.index === result.source.index) return;
    const prev = Array.isArray(value) ? [...value] : [];
    const [removed] = prev.splice(result.source.index, 1);
    prev.splice(result.destination.index, 0, removed);
    // Position 0 = main storefront image
    prev.forEach((it, i) => {
      if (it && typeof it === "object") it.isMain = i === 0;
    });
    onChange(prev);
    valueRef.current = prev;
  };

  const reorderImages = useCallback(
    (fromIndex, toIndex) => {
      if (!multiple) return;
      if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      const prev = Array.isArray(valueRef.current) ? [...valueRef.current] : [];
      if (fromIndex >= prev.length || toIndex >= prev.length) return;
      const [removed] = prev.splice(fromIndex, 1);
      prev.splice(toIndex, 0, removed);
      prev.forEach((it, i) => {
        if (it && typeof it === "object") it.isMain = i === 0;
      });
      onChange(prev);
      valueRef.current = prev;
    },
    [multiple, onChange]
  );

  const showDropzone = !multiple ? !single?.url : true;

  const stepLabel = (i) => {
    const labels = ["Reading file…", "Compressing…", "Converting to WebP…", "Uploading…"];
    return labels[i] || "";
  };

  return (
    <div
      className={
        galleryLayout ? "w-full max-w-full flex-col space-y-3 overflow-visible" : "space-y-3"
      }
    >
      {enableWatermark && !hideWatermarkToolbar ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-[#374151]">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#1d6fb8] focus:ring-[#1d6fb8]"
            />
            Add Watermark
          </label>
          {watermarkEnabled ? (
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Watermark text"
              className="mt-2 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm"
            />
          ) : null}
        </div>
      ) : null}

      {enableWatermark && hideWatermarkToolbar && watermarkEnabled ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-sm">
          <label className="mb-1 block text-xs font-medium text-[#374151]">Watermark text</label>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Watermark text"
            className="w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {processing && showControls && !galleryLayout ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Processing</p>
          <ul className="space-y-2">
            {STEP_IDS.map((id, i) => {
              const done = doneSteps.has(id);
              const current = currentStepIndex === i;
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <span className="text-emerald-600">✓</span>
                  ) : current ? (
                    <Spinner />
                  ) : (
                    <span className="text-[#d1d5db]">○</span>
                  )}
                  <span className={done ? "text-emerald-700" : current ? "font-medium text-[#1d6fb8]" : "text-[#9ca3af]"}>
                    {stepLabel(i)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {galleryLayout && uploadQueue.length > 0 ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Upload queue</p>
          <ul className="space-y-2">
            {uploadQueue.map((q) => (
              <li key={q.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#374151]">{q.name}</span>
                  <span className="shrink-0 text-xs text-[#6b7280]">
                    {q.status === "done" ? "Done" : q.status === "error" ? "Failed" : "Uploading…"}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      q.status === "error" ? "bg-red-500" : q.status === "done" ? "bg-emerald-500" : "bg-[#1d6fb8]",
                    ].join(" ")}
                    style={{ width: `${q.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {galleryLayout && lastBatchSummary ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {lastBatchSummary.count} image{lastBatchSummary.count === 1 ? "" : "s"} uploaded · Total saved:{" "}
          {formatBytes(lastBatchSummary.savedBytes)}
        </p>
      ) : null}

      {showDropzone ? (
        <div
          {...getRootProps()}
          className={[
            "cursor-pointer rounded-lg border-2 border-dashed border-[#e5e7eb] bg-[#f9fafb] px-4 text-center transition",
            galleryLayout ? "min-h-[120px] flex flex-col items-center justify-center py-6" : "py-8",
            isDragActive ? "border-[#1d6fb8] bg-[#eff6ff]" : "hover:border-[#1d6fb8]/50",
            processing ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input {...getInputProps()} />
          <UploadIcon />
          <p className="mt-2 text-sm font-medium text-[#374151]">Drag & drop or click to upload</p>
          {galleryLayout ? (
            <>
              <p className="mt-2 text-xs text-[#6b7280]">PNG, JPG, WebP, AVIF accepted</p>
              <p className="mt-1 text-xs text-[#6b7280]">Max {maxSizeMB} MB per image (after compression)</p>
              <p className="mt-1 text-xs text-[#6b7280]">Will be compressed & converted to WebP</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-[#6b7280]">Images will be compressed & converted to WebP</p>
              <p className="mt-2 text-xs text-[#9ca3af]">Max size after compression: {maxSizeMB} MB</p>
            </>
          )}
        </div>
      ) : null}

      {!multiple && single?.url ? (
        <PreviewCard
          galleryLayout={false}
          url={single.url}
          originalSize={single.originalSize}
          finalSize={single.finalSize}
          showControls={showControls}
          onRemove={() => onChange(null)}
          showMain={false}
          isMain={false}
        />
      ) : null}

      {multiple && items.length > 0 && galleryLayout ? (
        <div className="grid w-full grid-cols-2 gap-3">
          {items.map((item, index) => {
            const dragId = String(item._localId || item.publicId || item.url || `idx-${index}`);
            const isDragging = draggingIndex === index;
            const isOver = dragOverIndex === index && draggingIndex != null && draggingIndex !== index;
            return (
              <div
                key={dragId}
                className={[
                  "min-w-0 rounded-lg transition",
                  isOver ? "ring-2 ring-[#1d6fb8] ring-offset-2" : "",
                  isDragging ? "opacity-40" : "",
                ].join(" ")}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== index) setDragOverIndex(index);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const from = Number(e.dataTransfer.getData("application/x-media-index"));
                  reorderImages(from, index);
                  setDraggingIndex(null);
                  setDragOverIndex(null);
                }}
              >
                <PreviewCard
                  galleryLayout
                  isDragging={isDragging}
                  positionLabel={index + 1}
                  storefrontWatermark={storefrontWatermark}
                  url={item.url}
                  imageName={item.imageName}
                  altText={item.altText}
                  originalSize={item.originalSize}
                  finalSize={item.finalSize}
                  showControls={showControls}
                  onRemove={() => removeAt(index)}
                  onSetMain={() => setMainAt(index)}
                  showMain
                  isMain={Boolean(item.isMain) || index === 0}
                  onOpenCrop={() => setCropModal({ index, url: item.url, aspectPreset: "free" })}
                  onOpenEdit={() => setEditPanelIndex(index)}
                  onImageNameChange={(nextVal) => {
                    const prev = [...(valueRef.current || items)];
                    prev[index] = { ...prev[index], imageName: nextVal };
                    onChange(prev);
                    valueRef.current = prev;
                  }}
                  onAltTextChange={(nextVal) => {
                    const prev = [...(valueRef.current || items)];
                    prev[index] = { ...prev[index], altText: nextVal };
                    onChange(prev);
                    valueRef.current = prev;
                  }}
                  onMoveUp={index > 0 ? () => reorderImages(index, index - 1) : undefined}
                  onMoveDown={
                    index < items.length - 1 ? () => reorderImages(index, index + 1) : undefined
                  }
                  dragHandleProps={{
                    draggable: true,
                    onDragStart: (e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("application/x-media-index", String(index));
                      e.dataTransfer.effectAllowed = "move";
                      try {
                        e.dataTransfer.setData("text/plain", String(index));
                      } catch {
                        /* ignore */
                      }
                      setDraggingIndex(index);
                    },
                    onDragEnd: () => {
                      setDraggingIndex(null);
                      setDragOverIndex(null);
                    },
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {multiple && items.length > 0 && !galleryLayout ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="media-images">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              >
                {items.map((item, index) => {
                  const dragId = String(
                    item._localId || item.publicId || item.url || `idx-${index}`
                  );
                  return (
                    <Draggable key={dragId} draggableId={dragId} index={index}>
                      {(p) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          className="min-w-0"
                          style={p.draggableProps.style}
                        >
                          <PreviewCard
                            galleryLayout={false}
                            storefrontWatermark={storefrontWatermark}
                            url={item.url}
                            imageName={item.imageName}
                            altText={item.altText}
                            originalSize={item.originalSize}
                            finalSize={item.finalSize}
                            showControls={showControls}
                            onRemove={() => removeAt(index)}
                            onSetMain={() => setMainAt(index)}
                            showMain
                            isMain={Boolean(item.isMain) || index === 0}
                          />
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : null}

      {cropModal != null ? (
        <CropModal
          key={`${cropModal.url}-${cropModal.aspectPreset || "free"}-${cropModal.orientation || "landscape"}`}
          url={cropModal.url}
          aspectPreset={cropModal.aspectPreset || "free"}
          orientation={cropModal.orientation || "landscape"}
          onClose={() => setCropModal(null)}
          onApply={async (file) => {
            await replaceAtIndexWithFile(cropModal.index, file);
            setCropModal(null);
          }}
        />
      ) : null}

      {editPanelIndex != null && items[editPanelIndex] ? (
        <FullScreenImageEditor
          items={items}
          index={editPanelIndex}
          onNavigateIndex={(i) => {
            setCropModal(null);
            setEditPanelIndex(i);
          }}
          cropModalOpen={cropModal != null}
          onClose={() => setEditPanelIndex(null)}
          onSetMain={() => setMainAt(editPanelIndex)}
          onRemove={() => {
            removeAt(editPanelIndex);
            setEditPanelIndex(null);
          }}
          replaceAtIndexWithFile={replaceAtIndexWithFile}
          onUpdateItem={(patch) => {
            const prev = [...items];
            prev[editPanelIndex] = { ...prev[editPanelIndex], ...patch };
            onChange(prev);
            valueRef.current = prev;
          }}
          onRequestCrop={(opts) => {
            const it = items[editPanelIndex];
            if (!it) return;
            setCropModal({
              index: editPanelIndex,
              url: opts?.sourceUrl || it.url,
              aspectPreset: opts?.aspectPreset || "free",
              orientation: opts?.orientation || "landscape",
            });
          }}
          galleryProcessing={processing}
          enableWatermark={enableWatermark}
          hideWatermarkToolbar={hideWatermarkToolbar}
          watermarkEnabled={watermarkEnabled}
          setWatermarkEnabled={setWatermarkEnabled}
          watermarkText={watermarkText}
          setWatermarkText={setWatermarkText}
          usageContext={editorUsageContext}
        />
      ) : null}

      {galleryLayout && storefrontWatermark != null ? (
        <p className="text-xs text-[#6b7280]">
          {storefrontWatermark.enabled ? (
            <>
              Watermark will be applied automatically on the storefront. Manage watermark in Settings → Appearance.
            </>
          ) : (
            <>Watermark is currently disabled. Enable in Settings → Appearance.</>
          )}
        </p>
      ) : null}
    </div>
  );
}

function PreviewCard({
  galleryLayout = false,
  dragHandleProps,
  isDragging = false,
  positionLabel,
  storefrontWatermark,
  url,
  imageName,
  altText,
  originalSize,
  finalSize,
  showControls,
  onRemove,
  onSetMain,
  showMain,
  isMain,
  onOpenCrop,
  onOpenEdit,
  onImageNameChange,
  onAltTextChange,
  onMoveUp,
  onMoveDown,
}) {
  const saved = originalSize && finalSize ? pctSaved(originalSize, finalSize) : null;
  const name = (imageName && String(imageName).trim()) || filenameFromUrl(url);

  if (galleryLayout) {
    return (
      <div
        className={[
          "min-h-0 min-w-0 w-full overflow-hidden rounded-lg border bg-white shadow-sm",
          isDragging ? "border-[#1d6fb8]" : "border-[#e5e7eb]",
        ].join(" ")}
      >
        <div className="relative aspect-square w-full bg-[#f3f4f6]">
          <Image
            src={url}
            alt={altText || name || ""}
            fill
            className="object-cover"
            unoptimized
            sizes="160px"
          />
          <WatermarkCssOverlay watermark={storefrontWatermark} />

          <div className="absolute left-1 top-1 z-[2] flex max-w-[calc(100%-0.5rem)] flex-wrap items-center gap-1">
            <div
              role="button"
              tabIndex={0}
              title="Drag to reorder"
              className="flex h-7 cursor-grab select-none items-center gap-1 rounded-md bg-black/75 px-1.5 text-[10px] font-bold text-white shadow active:cursor-grabbing"
              {...(dragHandleProps || {})}
            >
              <span aria-hidden>⋮⋮</span>
              #{positionLabel ?? "?"}
            </div>
            {isMain ? (
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                MAIN
              </span>
            ) : null}
          </div>

          <div className="absolute bottom-1 left-1 right-1 z-[2] flex items-center justify-between gap-1">
            <div className="flex gap-0.5">
              {onMoveUp ? (
                <button
                  type="button"
                  title="Move earlier"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs font-bold text-[#374151] shadow"
                >
                  ↑
                </button>
              ) : null}
              {onMoveDown ? (
                <button
                  type="button"
                  title="Move later"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs font-bold text-[#374151] shadow"
                >
                  ↓
                </button>
              ) : null}
            </div>
            <div className="flex gap-0.5">
              {showMain ? (
                <button
                  type="button"
                  title="Set as main"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetMain?.();
                  }}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-md text-xs shadow",
                    isMain ? "bg-amber-400 text-amber-950" : "bg-white/95 text-[#374151]",
                  ].join(" ")}
                >
                  ★
                </button>
              ) : null}
              <button
                type="button"
                title="Crop"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCrop?.();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs text-[#374151] shadow"
              >
                ✂
              </button>
              <button
                type="button"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit?.();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs text-[#374151] shadow"
              >
                ✎
              </button>
              <button
                type="button"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs text-red-600 shadow"
              >
                🗑
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-[#e5e7eb] px-2 py-2">
          <input
            value={imageName || ""}
            onChange={(e) => onImageNameChange?.(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Name"
            className="h-7 w-full rounded border border-[#e5e7eb] px-2 text-xs outline-none focus:border-[#1d6fb8]"
          />
          <input
            value={altText || ""}
            onChange={(e) => onAltTextChange?.(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Alt text"
            className="h-7 w-full rounded border border-[#e5e7eb] px-2 text-xs outline-none focus:border-[#1d6fb8]"
          />
          {showControls && originalSize != null && finalSize != null ? (
            <p className="text-[10px] text-emerald-700">
              {formatBytes(finalSize)} · WebP
              {saved != null ? ` · ${saved}%` : ""}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          position: "relative",
          width: 300,
          height: 300,
          borderRadius: 10,
          overflow: "hidden",
          border: "2px solid #E5E7EB",
          background: "#F9FAFB",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Preview"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
        <WatermarkCssOverlay watermark={storefrontWatermark} />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove image"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            padding: "20px 10px 8px",
          }}
        >
          <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>✓ Image uploaded</span>
        </div>
      </div>
      {showMain ? (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onSetMain}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #E5E7EB",
              background: isMain ? "#FEF3C7" : "#F9FAFB",
              color: isMain ? "#92400E" : "#374151",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isMain ? "★ Main image" : "Set as main"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Fetch image, draw with optional rotate/flip, return WebP file. */
async function imageUrlToWebpFile(url, { rotate = 0, flipH = false, flipV = false } = {}) {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const w0 = bmp.width;
  const h0 = bmp.height;
  const rad = (rotate * Math.PI) / 180;
  const swap = Math.abs(rotate) % 180 === 90;
  const w = swap ? h0 : w0;
  const h = swap ? w0 : h0;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(bmp, -w0 / 2, -h0 / 2);
  bmp.close?.();
  const out = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.92));
  if (!out) throw new Error("Encode failed");
  return new File([out], "edit.webp", { type: "image/webp" });
}

function loadHtmlImage(url) {
  return new Promise((resolve, reject) => {
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

async function canvasToWebpFile(canvas, name = "edit.webp") {
  const blob = await new Promise((res) => canvas.toBlob((b) => res(b), "image/webp", 0.92));
  if (!blob) throw new Error("Encode failed");
  return new File([blob], name, { type: "image/webp" });
}

async function resizeUrlToDimensionsFile(url, targetW, targetH, lockAspect) {
  const im = await loadHtmlImage(url);
  let tw = Math.max(1, Math.round(Number(targetW) || 1));
  let th = Math.max(1, Math.round(Number(targetH) || 1));
  if (lockAspect) {
    const r = im.naturalWidth / Math.max(1, im.naturalHeight);
    th = Math.max(1, Math.round(tw / r));
  }
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(im, 0, 0, tw, th);
  return canvasToWebpFile(canvas, "resize.webp");
}

async function compositeImageOnColorFile(url, colorKeyOrHex) {
  const im = await loadHtmlImage(url);
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  const palette = {
    transparent: null,
    verydark: "#0f172a",
    dark: "#334155",
    gray: "#94a3b8",
    light: "#e2e8f0",
    white: "#ffffff",
    red: "#ef4444",
    yellow: "#eab308",
    green: "#22c55e",
    cyan: "#06b6d4",
    blue: "#3b82f6",
    magenta: "#d946ef",
  };
  const hex =
    typeof colorKeyOrHex === "string" && colorKeyOrHex.startsWith("#")
      ? colorKeyOrHex
      : palette[colorKeyOrHex];
  if (hex) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(im, 0, 0);
  return canvasToWebpFile(canvas, "bg.webp");
}

function cropRectForAspectPreset(nw, nh, preset, orient = "landscape") {
  const W = nw;
  const H = nh;
  const imgAr = W / H;
  if (preset === "free" || preset === "freeform" || !preset) {
    return { l: 0.05, t: 0.05, w: 0.9, h: 0.9 };
  }
  let r =
    preset === "original"
      ? imgAr
      : preset === "1"
        ? 1
        : preset === "3/2"
          ? 3 / 2
          : preset === "5/4"
            ? 5 / 4
            : preset === "7/5"
              ? 7 / 5
              : preset === "16/9"
                ? 16 / 9
                : imgAr;
  if (orient === "portrait" && preset !== "original") {
    r = 1 / r;
  }
  let nh1 = 0.85;
  let nw1 = nh1 * r * (H / W);
  if (nw1 > 0.92) {
    nw1 = 0.92;
    nh1 = (nw1 * W) / (r * H);
  }
  const nl = Math.max(0, (1 - nw1) / 2);
  const nt = Math.max(0, (1 - nh1) / 2);
  return { l: nl, t: nt, w: Math.min(nw1, 1 - nl), h: Math.min(nh1, 1 - nt) };
}

function CropModal({ url, onClose, onApply, aspectPreset = "free", orientation: orientationProp = "landscape" }) {
  const imgRef = useRef(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const initialAspect = aspectPreset === "freeform" ? "freeform" : aspectPreset || "free";
  const [rect, setRect] = useState({ l: 0.1, t: 0.1, w: 0.8, h: 0.8 });
  const [aspect, setAspect] = useState(initialAspect);
  const [orient, setOrient] = useState(orientationProp);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setNatural({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 });
    im.src = url;
  }, [url]);

  useEffect(() => {
    if (!natural.w || !natural.h) return;
    const a = aspectPreset === "freeform" ? "freeform" : aspectPreset || "free";
    setAspect(a);
    setOrient(orientationProp);
    setRect(cropRectForAspectPreset(natural.w, natural.h, a, orientationProp));
  }, [natural.w, natural.h, aspectPreset, orientationProp, url]);

  useEffect(() => {
    if (!natural.w || !natural.h) return;
    if (aspect === "free" || aspect === "freeform") return;
    setRect(cropRectForAspectPreset(natural.w, natural.h, aspect, orient));
  }, [orient, natural.w, natural.h, aspect]);

  const applyAspect = (mode) => {
    setAspect(mode);
    if (mode === "free" || mode === "freeform") {
      setRect({ l: 0.05, t: 0.05, w: 0.9, h: 0.9 });
      return;
    }
    setRect(cropRectForAspectPreset(natural.w, natural.h, mode, orient));
  };

  const handleApply = async () => {
    const im = imgRef.current;
    if (!im || !natural.w) return;
    setBusy(true);
    try {
      const sx = Math.round(rect.l * natural.w);
      const sy = Math.round(rect.t * natural.h);
      const sw = Math.max(1, Math.round(rect.w * natural.w));
      const sh = Math.max(1, Math.round(rect.h * natural.h));
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas");
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.92));
      if (!blob) throw new Error("Blob");
      const file = new File([blob], "crop.webp", { type: "image/webp" });
      await onApply(file);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Crop failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Crop image"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#111827]">✂ Crop and transform</h3>
          <button type="button" className="text-sm text-[#6b7280] hover:text-[#111827]" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mb-2 text-xs text-[#6b7280]">Adjust the crop box, then Apply. Uses full-resolution pixels.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="w-full text-xs font-medium text-[#6b7280]">Orientation</span>
          <button
            type="button"
            onClick={() => setOrient("landscape")}
            className={[
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              orient === "landscape" ? "border-[#1d6fb8] bg-[#eff6ff] text-[#1d4ed8]" : "border-[#e5e7eb] bg-white text-[#374151]",
            ].join(" ")}
          >
            □ Landscape
          </button>
          <button
            type="button"
            onClick={() => setOrient("portrait")}
            className={[
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              orient === "portrait" ? "border-[#1d6fb8] bg-[#eff6ff] text-[#1d4ed8]" : "border-[#e5e7eb] bg-white text-[#374151]",
            ].join(" ")}
          >
            □ Portrait
          </button>
        </div>
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-[#6b7280]">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "original", label: "○ Original" },
              { id: "1", label: "○ Square (1:1)" },
              { id: "3/2", label: "○ 3:2" },
              { id: "5/4", label: "○ 5:4" },
              { id: "7/5", label: "○ 7:5" },
              { id: "16/9", label: "○ 16:9" },
              { id: "freeform", label: "○ Freeform" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyAspect(id)}
                className={[
                  "rounded-md border px-2 py-1 text-left text-xs font-medium",
                  aspect === id ? "border-[#1d6fb8] bg-[#eff6ff] text-[#1d4ed8]" : "border-[#e5e7eb] bg-white text-[#374151]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mx-auto max-h-[55vh] w-full max-w-2xl bg-[#f3f4f6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={url} alt="" crossOrigin="anonymous" className="mx-auto max-h-[55vh] w-auto max-w-full object-contain" />
          <div
            className="pointer-events-none absolute border-2 border-[#1d6fb8] bg-[#1d6fb8]/20"
            style={{
              left: `${rect.l * 100}%`,
              top: `${rect.t * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e5e7eb] pt-3">
          <p className="w-full text-xs text-[#6b7280]">
            Fine-tune (normalized): use nudge buttons if needed — crop uses full image pixels.
          </p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, l: Math.min(0.95 - r.w, r.l + 0.02) }))}>
              ←
            </button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, l: Math.max(0, r.l - 0.02) }))}>
              →
            </button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, t: Math.max(0, r.t - 0.02) }))}>
              ↑
            </button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, t: Math.min(0.95 - r.h, r.t + 0.02) }))}>
              ↓
            </button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, w: Math.min(1 - r.l, r.w + 0.02) }))}>
              W+
            </button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRect((r) => ({ ...r, w: Math.max(0.1, r.w - 0.02) }))}>
              W−
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm font-medium" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-medium text-white hover:bg-[#185f9e] disabled:opacity-50"
            onClick={handleApply}
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

