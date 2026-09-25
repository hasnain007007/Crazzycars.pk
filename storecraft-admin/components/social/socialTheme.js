/** CrazzyCars social admin theme tokens */

export const COLORS = {
  brand: "#ED1C24",
  text: "#111114",
  textMuted: "#6B6B76",
  surface: "#F6F6F8",
  white: "#FFFFFF",
  border: "#E8E8ED",
  success: "#0D9488",
  warn: "#D97706",
  error: "#DC2626",
};

export const RADIUS = "16px";
export const SHADOW = "0 8px 24px rgba(0,0,0,0.06)";

export const FONT = "'Poppins', system-ui, sans-serif";

export const STATUS_STYLES = {
  draft: { label: "Draft", bg: "#E8E8ED", color: "#444452" },
  scheduled: { label: "Scheduled", bg: "#DBEAFE", color: "#1D4ED8" },
  publishing: { label: "Posting", bg: "#FEF3C7", color: "#B45309" },
  posting: { label: "Posting", bg: "#FEF3C7", color: "#B45309" },
  published: { label: "Posted", bg: "#D1FAE5", color: "#047857" },
  posted: { label: "Posted", bg: "#D1FAE5", color: "#047857" },
  partial: { label: "Partial", bg: "#FFEDD5", color: "#C2410C" },
  failed: { label: "Failed", bg: "#FEE2E2", color: "#B91C1C" },
  cancelled: { label: "Cancelled", bg: "#F3F4F6", color: "#6B7280" },
};

export function normalizeStatus(status) {
  const s = String(status || "draft").toLowerCase();
  if (s === "publishing") return "posting";
  if (s === "published") return "posted";
  return s;
}

export function cardClass(extra = "") {
  return `rounded-2xl bg-white border border-[#E8E8ED] ${extra}`.trim();
}

export function softCardStyle() {
  return {
    borderRadius: RADIUS,
    boxShadow: SHADOW,
    fontFamily: FONT,
  };
}

export function pageStyle() {
  return { fontFamily: FONT, color: COLORS.text };
}

export const ASPECT_MIN = 4 / 5;
export const ASPECT_MAX = 1.91;

export function aspectWarning(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!w || !h) return false;
  const ratio = w / h;
  return ratio < ASPECT_MIN || ratio > ASPECT_MAX;
}
