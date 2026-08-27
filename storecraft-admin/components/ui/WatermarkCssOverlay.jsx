"use client";

import { getWatermarkLabelStyle, getWatermarkOverlayStyle } from "@/lib/productImageWatermark";

export function WatermarkCssOverlay({ watermark }) {
  if (!watermark?.enabled || !watermark?.text) {
    return null;
  }
  return (
    <div style={getWatermarkOverlayStyle(watermark)} aria-hidden>
      <span style={getWatermarkLabelStyle(watermark)}>{watermark.text}</span>
    </div>
  );
}
