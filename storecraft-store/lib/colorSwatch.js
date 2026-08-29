/**
 * Map Color / Colour variation tags to a swatch fill.
 * Unknown names still get a stable fallback so the picker stays circular.
 */

const NAMED = {
  yellow: "#F5C400",
  gold: "#C9A227",
  amber: "#E6A817",
  orange: "#E85D04",
  red: "#DC2626",
  maroon: "#7F1D1D",
  burgundy: "#6B1226",
  pink: "#EC4899",
  rose: "#E11D48",
  purple: "#7C3AED",
  violet: "#6D28D9",
  blue: "#2563EB",
  navy: "#1E3A8A",
  teal: "#0D9488",
  green: "#16A34A",
  lime: "#84CC16",
  brown: "#7C4A1E",
  beige: "#D6C4A8",
  cream: "#F3E6C9",
  ivory: "#FFFFF0",
  white: "#FFFFFF",
  ivorywhite: "#FFFFF0",
  grey: "#8B8F94",
  gray: "#8B8F94",
  silver: "#C5C7CB",
  chrome: "#D4D4D8",
  titanium: "#8E9196",
  graphite: "#4B4F55",
  charcoal: "#364054",
  black: "#111111",
  "gloss black": "#111111",
  "matte black": "#1A1A1A",
  "piano black": "#0A0A0A",
  carbon: "#1F1F1F",
  "carbon fiber": "#1F1F1F",
  "carbon fibre": "#1F1F1F",
  smoke: "#6B7280",
  clear: "#F3F4F6",
  transparent: "#F3F4F6",
  nardo: "#7A7D80",
  bronze: "#8C6A3C",
};

export function isColorVariationName(name) {
  return /colou?r|shade|finish/i.test(String(name || "").trim());
}

export function variationTagLabel(tag) {
  if (tag == null) return "";
  if (typeof tag === "string") return tag.trim();
  if (typeof tag === "object") return String(tag.value ?? tag.label ?? "").trim();
  return String(tag).trim();
}

function fallbackHex(label) {
  let h = 0;
  for (const ch of String(label)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 28% 42%)`;
}

export function resolveSwatchHex(label) {
  const raw = String(label || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  const s = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return fallbackHex("color");
  if (NAMED[s]) return NAMED[s];
  const keys = Object.keys(NAMED).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (s.includes(key)) return NAMED[key];
  }
  return fallbackHex(s);
}

export function swatchNeedsRing(hex) {
  const h = String(hex || "").toLowerCase();
  return h === "#ffffff" || h === "#fffff0" || h === "#f3f4f6" || h === "#f3e6c9";
}
