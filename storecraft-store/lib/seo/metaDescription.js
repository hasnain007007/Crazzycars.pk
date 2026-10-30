/**
 * Meta description in the 70–160 character range: first candidate that fits, else the
 * first non-empty one padded with a factual tail, cut at a word boundary under 160.
 */
export const META_MIN = 70;
export const META_MAX = 160;

function clamp(text) {
  if (text.length <= META_MAX) return text;
  const cut = text.slice(0, META_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/, "")}…`;
}

export function fitMetaDescription(candidates = [], tail = "") {
  const list = candidates.map((c) => String(c || "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const fits = list.find((c) => c.length >= META_MIN && c.length <= META_MAX);
  if (fits) return fits;
  const base = list[0] || "";
  if (!base) return clamp(String(tail || "").trim());
  if (base.length < META_MIN && tail) return clamp(`${base.replace(/[.\s]*$/, ".")} ${tail}`.trim());
  return clamp(base);
}
