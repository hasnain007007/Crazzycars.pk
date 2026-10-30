/**
 * Product name as shown to shoppers (H1, cards, breadcrumbs, image alt, JSON-LD).
 * Drops claim words we do not make ("Premium", "OEM", "Original", "Genuine") and fixes
 * the truncated "Butto". The stored name in the database is never changed.
 */
const CLAIM_WORDS = /\b(premium|oem|original|genuine)\b/gi;

export function displayProductName(raw) {
  const name = String(raw ?? "");
  const cleaned = name
    .replace(/\bButto\b/g, "Button")
    // "Premium Quality" → drop the whole phrase, not leave a lone "Quality".
    .replace(/\b(premium|original|genuine|oem)\s+quality\b/gi, "")
    .replace(CLAIM_WORDS, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,)–—-])/g, "$1")
    .replace(/([(–—-])\s+(?=[)–—-])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, "")
    .trim();
  return cleaned || name.trim();
}

/**
 * Marketing sentences (stored settings copy): drop the same claim words and re-capitalise.
 * "Premium car accessories delivered across Pakistan" → "Car accessories delivered across Pakistan".
 */
export function neutralizeClaimText(raw) {
  const text = String(raw ?? "");
  const out = text
    .replace(/\b(premium|original|genuine|oem)\s+quality\b/gi, "quality")
    .replace(CLAIM_WORDS, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  return out ? out.charAt(0).toUpperCase() + out.slice(1) : text;
}
