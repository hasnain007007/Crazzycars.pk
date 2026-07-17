export const DEFAULT_PRODUCT_IMAGE_WATERMARK = {
  enabled: true,
  text: "Crazzycars.pk",
  position: "bottom-right",
  opacity: 0.7,
  fontSize: 24,
  color: "#FFFFFF",
};

const POSITIONS = ["bottom-right", "bottom-left", "bottom-center", "top-right", "top-left"];

export function normalizeProductImageWatermark(raw) {
  const w = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: w.enabled !== false,
    text: String(w.text ?? DEFAULT_PRODUCT_IMAGE_WATERMARK.text).trim() || DEFAULT_PRODUCT_IMAGE_WATERMARK.text,
    position: POSITIONS.includes(w.position) ? w.position : DEFAULT_PRODUCT_IMAGE_WATERMARK.position,
    opacity: Math.min(1, Math.max(0, Number(w.opacity ?? DEFAULT_PRODUCT_IMAGE_WATERMARK.opacity))),
    fontSize: Math.max(8, Number(w.fontSize) || DEFAULT_PRODUCT_IMAGE_WATERMARK.fontSize),
    color: String(w.color || DEFAULT_PRODUCT_IMAGE_WATERMARK.color).trim() || DEFAULT_PRODUCT_IMAGE_WATERMARK.color,
  };
}

export function getWatermarkOverlayStyle(watermark) {
  const position = watermark?.position || "bottom-right";
  const style = {
    position: "absolute",
    color: watermark?.color || "#FFFFFF",
    fontSize: `${watermark?.fontSize || 24}px`,
    fontWeight: 700,
    opacity: watermark?.opacity ?? 0.7,
    textShadow: "1px 1px 3px rgba(0, 0, 0, 0.8)",
    fontFamily: "Rajdhani, sans-serif",
    pointerEvents: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
    zIndex: 2,
  };
  if (position.includes("bottom")) style.bottom = "10px";
  else style.top = "10px";
  if (position.includes("right")) style.right = "10px";
  else if (position.includes("left")) style.left = "10px";
  else {
    style.left = "50%";
    style.transform = "translateX(-50%)";
  }
  return style;
}
