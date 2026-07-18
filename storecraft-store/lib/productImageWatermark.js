export const DEFAULT_PRODUCT_IMAGE_WATERMARK = {
  enabled: true,
  text: "Crazzycars.pk",
  position: "bottom-right",
  opacity: 0.25,
  fontSize: 13,
  color: "#8A8A8A",
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

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const WHITE_RE = /^(#fff(fff)?|white)$/i;

/**
 * Tiled diagonal watermark (gulautos.pk style): the text repeats across the
 * whole image, rotated, in a subtle gray. Returns a style for a full-cover
 * overlay div (no text content needed).
 */
export function getWatermarkOverlayStyle(watermark) {
  const label = escapeXml(String(watermark?.text || "").toUpperCase());
  // Font size and opacity come straight from admin settings (Settings → Product Image Watermark).
  const fontSize = Math.max(8, Math.min(60, Number(watermark?.fontSize) || DEFAULT_PRODUCT_IMAGE_WATERMARK.fontSize));
  const rawColor = String(watermark?.color || "#8A8A8A").trim();
  // Tiled white-on-white is invisible; fall back to the reference gray.
  const fill = WHITE_RE.test(rawColor) ? "#8A8A8A" : rawColor;
  const fillOpacity = Math.min(1, Math.max(0, Number(watermark?.opacity ?? DEFAULT_PRODUCT_IMAGE_WATERMARK.opacity)));

  const tileW = Math.max(140, Math.round(label.length * fontSize * 0.72) + fontSize * 3);
  const tileH = Math.round(tileW * 0.72);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ` +
    `transform="rotate(-30 ${tileW / 2} ${tileH / 2})" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600" ` +
    `letter-spacing="${Math.round(fontSize * 0.3)}" fill="${fill}" fill-opacity="${fillOpacity}">` +
    `${label}</text></svg>`;

  return {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`,
    backgroundRepeat: "repeat",
    backgroundSize: `${tileW}px ${tileH}px`,
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 2,
  };
}
