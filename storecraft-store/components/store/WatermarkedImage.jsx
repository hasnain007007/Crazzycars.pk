"use client";

import { useEffect, useState } from "react";
import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";
import { cardImageUrl, cloudinarySrcSet, cloudinaryUrl } from "@/lib/cloudinaryImage";

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
  itemProp,
}) {
  const [failed, setFailed] = useState(false);
  const [retrySrc, setRetrySrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Reset error/retry/load state when the gallery switches to another image.
  useEffect(() => {
    setFailed(false);
    setRetrySrc(null);
    setLoaded(false);
  }, [src]);

  const rawSrc = retrySrc || src;
  const optimized =
    optimize
      ? crop === "fill"
        ? cardImageUrl(rawSrc, width)
        : cloudinaryUrl(rawSrc, { width, crop })
      : rawSrc;
  // Cloudinary URLs resolve to "" (account disabled) — treat as missing.
  const resolved = optimized || (!/res\.cloudinary\.com/i.test(String(rawSrc || "")) ? rawSrc : "");

  if (!src) return null;
  if (failed || !resolved) {
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

  const srcSetWidths = widths || [Math.round(width * 0.75), width, Math.round(width * 1.5)];
  const srcSet =
    optimize &&
    responsive &&
    !/res\.cloudinary\.com/i.test(String(src)) &&
    !/crazzycars\.pk\/media\/|^\/media\//i.test(String(resolved))
      ? cloudinarySrcSet(src, srcSetWidths, { crop })
      : undefined;

  const showWatermark = Boolean(watermark?.enabled && watermark?.text && loaded);

  const imgProps = {
    src: resolved,
    alt: alt || "",
    className: imgClassName,
    style: imgStyle,
    loading,
    decoding: "async",
    fetchPriority,
    ...(itemProp ? { itemProp } : {}),
    onLoad: () => setLoaded(true),
    onError: () => {
      // Thumb (-400.webp) missing → fall back to the original master URL once.
      const master = String(src || "").trim();
      if (!retrySrc && master && resolved !== master && !/-400\./i.test(master)) {
        setRetrySrc(master);
        setLoaded(false);
        return;
      }
      const fallback = cardImageUrl(src, width) || String(src || "").split("?")[0];
      if (!retrySrc && fallback && fallback !== resolved) {
        setRetrySrc(fallback);
        setLoaded(false);
        return;
      }
      setFailed(true);
    },
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
      {showWatermark ? <div style={getWatermarkOverlayStyle(watermark)} aria-hidden /> : null}
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
