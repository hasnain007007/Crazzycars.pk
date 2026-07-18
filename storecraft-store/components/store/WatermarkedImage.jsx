"use client";

import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";
import { cardImageUrl } from "@/lib/cloudinaryImage";

export function WatermarkedImage({
  src,
  alt,
  watermark,
  className,
  imgClassName,
  style,
  imgStyle,
  loading = "lazy",
  fetchPriority,
  optimize = true,
}) {
  if (!src) {
    return null;
  }

  const resolved = optimize ? cardImageUrl(src) || src : src;

  if (!watermark?.enabled || !watermark?.text) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt || ""}
        className={imgClassName}
        style={imgStyle}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    );
  }

  return (
    <div className={className} style={{ position: "relative", display: "inline-block", width: "100%", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt || ""}
        className={imgClassName}
        style={{ width: "100%", display: "block", ...imgStyle }}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
      <div style={getWatermarkOverlayStyle(watermark)} aria-hidden />
    </div>
  );
}
