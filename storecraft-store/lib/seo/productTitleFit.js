/**
 * Fit long product names into a ≤60 character <title> without losing what the product is.
 *
 * Per-car variants are named "Vehicle · years descriptor Product", e.g.
 *   "Toyota Corolla Altis Local facelift · 2018–2026 Carbon-look Batman rear splitter pair".
 * Cutting that from the end drops "rear splitter pair", so the front splitter, rear
 * splitter and side skirts for one car all ended up with the same title. Here the product
 * goes first and the vehicle part is shortened instead:
 *   "Carbon-look Batman rear splitter pair – Toyota Corolla 2018–2026".
 *
 * Colour variants ("…Kit– Black") keep their colour so sibling pages stay distinct.
 */

const YEARS_RE = /\b((?:19|20)\d{2}\s*[–—-]\s*(?:(?:19|20)\d{2}|present))\b/i;
const LEADING_DESCRIPTOR_RE = /^((?:pre[-\s]?)?facelift)\b\s*/i;
// Colour tail after an en or em dash: "Kit– Black", "Tray – Tan / orange". Only colours:
// other dash tails ("– Universal", "– ABS Plastic") are descriptions, not sibling variants.
const COLOURS =
  "black|white|red|blue|orange|tan|grey|gray|silver|beige|brown|green|yellow|chrome|gold|pink|purple|maroon|terracotta|cream";
const VARIANT_RE = new RegExp(`\\s*[–—]\\s*((?:${COLOURS})\\b[A-Za-z /&]{0,22})$`, "i");

function clean(s) {
  return String(s || "").replace(/\s{2,}/g, " ").trim();
}

function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** "Orange / terracotta" from "Deepal S05 Console Organizer Kit– Orange / terracotta". */
export function productVariantLabel(name) {
  const m = clean(name).match(VARIANT_RE);
  return m ? clean(m[1]) : "";
}

/**
 * Add the colour/variant from the product name when the chosen title lacks it.
 * "Orange / terracotta" shortens to "Orange" when the full label would push past maxLen.
 */
export function withVariantLabel(title, name, maxLen = 60) {
  const base = clean(title);
  const variant = productVariantLabel(name);
  if (!base || !variant) return base;
  if (base.toLowerCase().includes(variant.toLowerCase())) return base;
  const stem = base.replace(VARIANT_RE, "").replace(/[\s–—-]+$/g, "");
  // "Side Shutter Covers | Price in PKR" → colour goes before the "| …" part.
  const bar = stem.indexOf(" | ");
  const head = bar >= 0 ? stem.slice(0, bar) : stem;
  const tail = bar >= 0 ? stem.slice(bar) : "";
  const full = `${head} – ${variant}${tail}`;
  if (full.length <= maxLen) return full;
  const short = clean(variant.split(/\s*(?:\/|&|\bwith\b)\s*/i)[0]);
  return short && short !== variant ? `${head} – ${short}${tail}` : full;
}

/**
 * Product-first rewrite for "Vehicle · …" names that are over maxLen.
 * Returns "" when the name doesn't follow that pattern or nothing fits.
 */
export function productFirstTitle(name, maxLen = 60) {
  const s = clean(name);
  const dot = s.indexOf(" · ");
  if (dot < 0 || s.length <= maxLen) return "";

  let vehicle = s.slice(0, dot);
  let rest = s.slice(dot + 3);
  let years = "";
  for (const part of ["vehicle", "rest"]) {
    const src = part === "vehicle" ? vehicle : rest;
    const m = src.match(YEARS_RE);
    if (m && !years) {
      years = m[1].replace(/\s+/g, "");
      if (part === "vehicle") vehicle = clean(src.replace(m[0], ""));
      else rest = clean(src.replace(m[0], ""));
    }
  }
  const desc = rest.match(LEADING_DESCRIPTOR_RE);
  if (desc) {
    vehicle = clean(`${vehicle} ${desc[1]}`);
    rest = clean(rest.slice(desc[0].length));
  }
  const product = capitalise(rest);
  if (!product) return "";

  const words = vehicle.split(" ").filter(Boolean);
  const tries = [];
  // Keep the years (they tell generations apart) and drop trailing vehicle words first.
  for (let n = words.length; n >= 2; n -= 1) {
    const v = words.slice(0, n).join(" ");
    if (years) tries.push(`${v} ${years}`);
    else tries.push(v);
  }
  if (years) for (let n = words.length; n >= 2; n -= 1) tries.push(words.slice(0, n).join(" "));

  for (const v of tries) {
    const t = `${product} – ${v}`;
    if (t.length <= maxLen) return t;
  }
  return "";
}
