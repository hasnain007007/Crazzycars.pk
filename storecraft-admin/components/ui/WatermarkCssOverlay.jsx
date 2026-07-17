"use client";

import { getWatermarkOverlayStyle } from "@/lib/productImageWatermark";

export function WatermarkCssOverlay({ watermark }) {
  if (!watermark?.enabled || !watermark?.text) {
    return null;
  }
  return <div style={getWatermarkOverlayStyle(watermark)} aria-hidden />;
}
