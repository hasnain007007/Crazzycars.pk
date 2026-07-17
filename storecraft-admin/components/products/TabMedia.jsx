/**
 * Product media: multi-image WebP upload, reorder, main image, optional watermark.
 * Plus a single Product Video URL (YouTube embed or direct .mp4 link).
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import VideoUploader from "@/components/ui/VideoUploader";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";

const MAX_IMAGES = 20;

function parseYouTubeId(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return "";
}

function detectVideoType(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (parseYouTubeId(url)) return "youtube";
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return "mp4";
  return "";
}

function VideoPreview({ url, type }) {
  if (!url) return null;
  if (type === "youtube") {
    const id = parseYouTubeId(url);
    if (!id) return null;
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title="Product video preview"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }
  if (type === "mp4") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-black">
        <video
          src={url}
          controls
          preload="metadata"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚠ Could not auto-detect video type. Please paste a YouTube link or a
      direct .mp4 URL.
    </p>
  );
}

export default function TabMedia({
  value,
  onChange,
  enableWatermark = true,
  multiple = true,
  maxSizeMB = 1,
  maxImageWidth = 1200,
  uploadFolder = "products",
  defaultWatermarkText,
  showControls = true,
  watermarkEnabled,
  onWatermarkEnabledChange,
  hideWatermarkToolbar = false,
  editorUsageContext,
  itemName = "",
  existingImageCount = 0,
  videos = [],
  onVideosChange,
  videoUrl = "",
  videoType = "",
  onVideoChange,
}) {
  const list = Array.isArray(value) ? value : [];
  const count = list.length;
  const [storefrontWatermark, setStorefrontWatermark] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json?.success) return;
        setStorefrontWatermark(normalizeProductImageWatermark(json.settings?.productImageWatermark));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const detectedType = useMemo(() => detectVideoType(videoUrl), [videoUrl]);
  const effectiveType = videoType || detectedType;

  const subtitle = useMemo(
    () => "First image is shown as the main product image on the storefront.",
    []
  );

  function handleVideoUrlChange(nextUrl) {
    if (typeof onVideoChange !== "function") return;
    const trimmed = String(nextUrl || "").trim();
    onVideoChange({
      videoUrl: trimmed,
      videoType: detectVideoType(trimmed),
    });
  }

  return (
    <div className="flex min-h-[500px] flex-col space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-[#111827]">Product Images</h3>
          <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-xs font-semibold text-[#1d4ed8]">
            {count} / {MAX_IMAGES} images
          </span>
        </div>
        <p className="mt-1 text-sm text-[#6b7280]">{subtitle}</p>
        <p className="mt-1 text-xs text-[#9ca3af]">Drag to reorder thumbnails (use the ↕ handle on hover).</p>
      </div>

      <ImageUploader
        value={list}
        onChange={onChange}
        multiple={multiple}
        maxSizeMB={maxSizeMB}
        maxImageWidth={maxImageWidth}
        uploadFolder={uploadFolder}
        enableWatermark={enableWatermark}
        defaultWatermarkText={defaultWatermarkText ?? process.env.NEXT_PUBLIC_APP_NAME ?? `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`}
        showControls={showControls}
        watermarkEnabled={watermarkEnabled}
        onWatermarkEnabledChange={onWatermarkEnabledChange}
        hideWatermarkToolbar={hideWatermarkToolbar}
        galleryLayout
        editorUsageContext={editorUsageContext}
        itemName={itemName}
        existingImageCount={existingImageCount}
        storefrontWatermark={storefrontWatermark}
      />

      {typeof onVideosChange === "function" ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <h3 className="text-base font-semibold text-[#111827]">Product Videos</h3>
          <p className="mt-1 text-sm text-[#6b7280]">
            Upload product videos. Files are automatically optimized and converted to WebM with MP4 fallback.
          </p>
          <div className="mt-4">
            <VideoUploader videos={Array.isArray(videos) ? videos : []} onChange={onVideosChange} maxVideos={3} />
          </div>
        </div>
      ) : null}

      {/* Product Video */}
      {typeof onVideoChange === "function" ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-[#111827]">Product Video URL</h3>
            {effectiveType ? (
              <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-xs font-semibold text-[#166534] uppercase">
                {effectiveType}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            Paste a YouTube URL or direct .mp4 video link. Video will appear on
            the product page next to the image gallery.
          </p>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => handleVideoUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://crazzycars.pk/video.mp4"
            className="mt-3 h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none ring-[#1d6fb8]/25 focus:ring-2"
          />
          {videoUrl ? (
            <div className="mt-4 max-w-md">
              <VideoPreview url={videoUrl} type={effectiveType} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
