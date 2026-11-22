/**
 * Some official payment accounts are registered in the owner's personal name
 * (e.g. Easypaisa / Meezan), others as "CrazzyCars". A customer's banking app shows
 * the registered title, so a personal name next to brand-named accounts looks like
 * a scam unless we say whose it is. Names come from admin settings (never hard-coded).
 */
const BRAND_RE = /crazz?y\s*cars/i;

/** Distinct account titles that are not the CrazzyCars brand. */
export function ownerTitles(titles) {
  const seen = new Map();
  for (const raw of titles || []) {
    const t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t || BRAND_RE.test(t)) continue;
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()];
}

/** Customer-facing reassurance line, or "" when every account is brand-titled. */
export function ownerTitleNote(titles) {
  const names = ownerTitles(titles);
  if (!names.length) return "";
  const list = names.map((n) => `“${n}”`).join(" and ");
  const are = names.length > 1 ? "are" : "is";
  return `${list} ${are} the owner of CrazzyCars.pk — accounts in this name are official CrazzyCars.pk accounts.`;
}
