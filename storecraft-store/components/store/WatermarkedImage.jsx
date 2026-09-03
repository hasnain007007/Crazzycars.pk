"use client";

import { useState } from "react";
import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";
import { cardImageUrl, cloudinarySrcSet, cloudinaryUrl, isLocalMedia } from "@/lib/cloudinaryImage";

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
  width = 480,
  crop = "fill",
  widths,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  responsive = true,
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    if (!src) return null;
    return (
      <div
        className={className || imgClassName}
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#F3F4F6",
          color: "#9CA3AF",
          fontSize: 12,
          ...style,
          ...imgStyle,
        }}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        Image unavailable
      </div>
    );
  }

  const resolved = optimize
    ? (crop === "fill" ? cardImageUrl(src, width) : cloudinaryUrl(src, { width, crop })) || src
    : src;
  const srcSetWidths = widths || [Math.round(width * 0.75), width, Math.round(width * 1.5)];
  const srcSet =
    optimize && responsive && (String(src).includes("res.cloudinary.com") || isLocalMedia(src))
      ? cloudinarySrcSet(src, srcSetWidths, { crop })
      : undefined;

  const imgProps = {
    src: resolved,
    alt: alt || "",
    className: imgClassName,
    style: imgStyle,
    loading,
    decoding: "async",
    fetchPriority,
    onError: () => setFailed(true),
    ...(srcSet ? { srcSet, sizes } : {}),
  };

  if (!watermark?.enabled || !watermark?.text) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...imgProps} style={{ width: "100%", height: "100%", display: "block", ...imgStyle }} />
    );
  }

  return (
    <div
      className={className}
      style={{ position: "relative", display: "block", width: "100%", height: "100%", ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imgProps} style={{ width: "100%", height: "100%", display: "block", ...imgStyle }} />
      <div style={getWatermarkOverlayStyle(watermark)} aria-hidden />
    </div>
  );
}

/** Loads hover image only after pointer enters (saves bandwidth on product grids). */
export function DeferredHoverImage({
  src,
  alt = "",
  watermark,
  width = 480,
  imgClassName,
  imgStyle,
}) {
  const [active, setActive] = useState(false);
  if (!src) return null;

  return (
    <div
      className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      onMouseEnter={() => setActive(true)}
      onFocus={() => setActive(true)}
    >
      {active ? (
        <WatermarkedImage
          src={src}
          alt={alt}
          watermark={watermark}
          className="h-full w-full"
          imgClassName={imgClassName || "h-full w-full object-cover"}
          imgStyle={imgStyle}
          width={width}
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
