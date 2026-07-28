"use client";

import { useState } from "react";
import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";
import { cardImageUrl, cloudinarySrcSet } from "@/lib/cloudinaryImage";

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
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  responsive = true,
}) {
  if (!src) {
    return null;
  }

  const resolved = optimize ? cardImageUrl(src, width) || src : src;
  const srcSet =
    optimize && responsive && String(src).includes("res.cloudinary.com")
      ? cloudinarySrcSet(src, [Math.round(width * 0.75), width, Math.round(width * 1.5)])
      : undefined;

  const imgProps = {
    src: resolved,
    alt: alt || "",
    className: imgClassName,
    style: imgStyle,
    loading,
    decoding: "async",
    fetchPriority,
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
