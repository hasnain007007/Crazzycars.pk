/** Canonical storefront contact email and default brand name (The Chain Gang). */
export const STORE_DEFAULT_NAME = "The Chain Gang";
export const STORE_CONTACT_EMAIL = "info@thechaingang.eu";

const LEGACY_EMAILS = new Set(["support@chaingang.com", "support@chaingang.eu"]);

/** Normalize legacy support addresses to the single public contact email. */
export function normalizeStoreEmail(email) {
  const trimmed = String(email || "").trim();
  if (!trimmed || LEGACY_EMAILS.has(trimmed.toLowerCase())) {
    return STORE_CONTACT_EMAIL;
  }
  return trimmed;
}
