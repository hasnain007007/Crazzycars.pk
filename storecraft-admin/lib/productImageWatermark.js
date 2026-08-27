export const DEFAULT_PRODUCT_IMAGE_WATERMARK = {
  enabled: true,
  text: "Homefy.pk",
  position: "bottom-center",
  opacity: 0.85,
  fontSize: 11,
  color: "#FAF7F2",
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

const WHITE_RE = /^(#fff(fff)?|white)$/i;

export function getWatermarkOverlayStyle(watermark) {
  const position = POSITIONS.includes(watermark?.position)
    ? watermark.position
    : DEFAULT_PRODUCT_IMAGE_WATERMARK.position;
  const isTop = position.startsWith("top");
  const justify = position.endsWith("left") ? "flex-start" : position.endsWith("right") ? "flex-end" : "center";
  const isStrip = position === "bottom-center";

  return {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: isTop ? "flex-start" : "flex-end",
    justifyContent: isStrip ? "stretch" : justify,
    padding: isStrip ? 0 : "8px 10px",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 2,
  };
}

export function getWatermarkLabelStyle(watermark) {
  const position = POSITIONS.includes(watermark?.position)
    ? watermark.position
    : DEFAULT_PRODUCT_IMAGE_WATERMARK.position;
  const isStrip = position === "bottom-center";
  const fontSize = Math.max(8, Math.min(16, Number(watermark?.fontSize) || DEFAULT_PRODUCT_IMAGE_WATERMARK.fontSize));
  const rawColor = String(watermark?.color || DEFAULT_PRODUCT_IMAGE_WATERMARK.color).trim();
  const color = WHITE_RE.test(rawColor) ? "#FAF7F2" : rawColor;
  const opacity = Math.min(1, Math.max(0, Number(watermark?.opacity ?? DEFAULT_PRODUCT_IMAGE_WATERMARK.opacity)));

  if (isStrip) {
    return {
      display: "block",
      width: "100%",
      textAlign: "center",
      padding: "5px 10px",
      background: "rgba(17, 17, 17, 0.42)",
      color,
      opacity,
      fontSize,
      fontWeight: 600,
      letterSpacing: "0.08em",
      lineHeight: 1.2,
      fontFamily: "Georgia, 'Times New Roman', serif",
    };
  }

  return {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    background: "rgba(17, 17, 17, 0.45)",
    color,
    opacity,
    fontSize,
    fontWeight: 600,
    letterSpacing: "0.06em",
    lineHeight: 1.2,
    fontFamily: "Georgia, 'Times New Roman', serif",
    whiteSpace: "nowrap",
  };
}
