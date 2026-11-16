/**
 * Temporary storefront display belt for forbidden image alt phrases.
 * Keep banlist in sync with storecraft-admin/lib/mediaAltGuard.js.
 *
 * TODO(remove-reconstructed-alt-belt): delete this layer once Mongo alts are
 * rewritten to product names and real product photos replace the reconstructed
 * gallery images (18 + CC-0283 set). Until then, never show
 * "reconstructed … branding" on customer-facing pages.
 */

export const FORBIDDEN_ALT_MATCHERS = [
  { token: "reconstructed", re: /reconstructed/i },
  { token: "reconstruction", re: /reconstruction/i },
  { token: "visual", re: /\bvisual\b/i },
  { token: "branding", re: /branding/i },
  { token: "illustrated", re: /illustrated/i },
  { token: "ai-generated", re: /ai[\s-]?generated/i },
];

export function findForbiddenAltToken(alt) {
  const s = String(alt || "");
  if (!s.trim()) return null;
  for (const m of FORBIDDEN_ALT_MATCHERS) {
    if (m.re.test(s)) return m.token;
  }
  return null;
}

export function defaultAltForImage(productName, isMain = true) {
  const name = String(productName || "").trim();
  if (!name) return "";
  return isMain ? name : `${name} - detail`;
}

/**
 * If stored alt contains a forbidden phrase, substitute product name
 * (or name + " - detail" for non-main). Otherwise return the stored alt.
 */
export function customerFacingAlt(alt, productName, isMain = true) {
  const stored = String(alt || "").trim();
  if (!findForbiddenAltToken(stored)) return stored;
  return defaultAltForImage(productName, isMain);
}
