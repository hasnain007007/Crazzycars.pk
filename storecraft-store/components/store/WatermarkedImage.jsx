"use client";

import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";

export function WatermarkedImage({ src, alt, watermark, className, imgClassName, style, imgStyle }) {
  if (!src) {
    return null;
  }

  if (!watermark?.enabled || !watermark?.text) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt || ""} className={imgClassName} style={imgStyle} />
    );
  }

  return (
    <div className={className} style={{ position: "relative", display: "inline-block", width: "100%", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ""}
        className={imgClassName}
        style={{ width: "100%", display: "block", ...imgStyle }}
      />
      <div style={getWatermarkOverlayStyle(watermark)}>{watermark.text}</div>
    </div>
  );
}
