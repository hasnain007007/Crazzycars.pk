/**
 * Single brand constant for titles, JSON-LD, and on-page copy.
 * Domain/URL strings stay as crazzycars.pk (lowercase host).
 */

export const BRAND_NAME = "CrazzyCars.pk";

/** Appended to page titles when the result stays ≤ 60 chars. */
export const TITLE_SUFFIX = " | CrazzyCars.pk";

/** @deprecated use BRAND_NAME */
export const BRAND = BRAND_NAME;

/** @deprecated use BRAND_NAME — kept so older imports keep compiling */
export const PRODUCT_TITLE_BRAND = BRAND_NAME;

/** @deprecated use BRAND_NAME */
export const CATEGORY_TITLE_BRAND = BRAND_NAME;

const TRAILING_BRAND_RE =
  /\s*[|\u2013\u2014–—-]\s*Crazzy\s*Cars(?:\.pk)?\s*$/i;

/** Strip any trailing `| CrazzyCars(.pk)` variant. */
export function stripTrailingBrandSuffix(raw) {
  let title = String(raw || "").trim();
  for (let i = 0; i < 3; i += 1) {
    const next = title
      .replace(TRAILING_BRAND_RE, "")
      .replace(/[\s|\u2013\u2014–—-]+$/g, "")
      .trim();
    if (next === title) break;
    title = next;
  }
  return title;
}

/**
 * Normalise admin SEO titles: strip brand variants, then add TITLE_SUFFIX once
 * when the branded title fits in maxLen (default 60). Over budget → no suffix.
 * Never truncates mid-word or mid-brand (no "… | CrazzyCar").
 */
export function withBrandTitleSuffix(raw, { maxLen = 60 } = {}) {
  const base = stripTrailingBrandSuffix(raw);
  if (!base) return BRAND_NAME;
  const branded = `${base}${TITLE_SUFFIX}`;
  if (branded.length <= maxLen) return branded;
  // Prefer the un-suffixed base when it already fits; never slice the brand token.
  if (base.length <= maxLen) return base;
  // Soft-trim base at a word boundary so we never cut "CrazzyCars.pk" mid-token.
  const cut = base.slice(0, maxLen);
  const at = cut.lastIndexOf(" ");
  const soft = (at > Math.floor(maxLen * 0.55) ? cut.slice(0, at) : cut)
    .replace(/[\s|\u2013\u2014–—-]+$/g, "")
    .trim();
  const candidate = soft || base.slice(0, maxLen).trim();
  // If soft-trim still ends with a partial brand fragment, drop the fragment.
  return candidate.replace(/\s*\|\s*Crazzy\s*Car?s?\.?p?k?$/i, "").trim() || BRAND_NAME;
}
