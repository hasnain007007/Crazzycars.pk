/** Canonical storefront contact email and default brand name (Homefy.pk). */
export const STORE_DEFAULT_NAME = "Homefy.pk";
export const STORE_CONTACT_EMAIL = "support@homefy.pk"; // TODO: replace with real business info

const LEGACY_EMAILS = new Set([
  "support@chaingang.com",
  "support@chaingang.eu",
  "info@thechaingang.eu",
  // Pre-rebrand store emails still stored on footer.contactEmail in some Settings docs
  "sialkotmotorssports@gmail.com",
  "sialkotmotorsports@gmail.com",
]);

/** Normalize legacy support addresses to the single public contact email. */
export function normalizeStoreEmail(email) {
  const trimmed = String(email || "").trim();
  if (!trimmed || LEGACY_EMAILS.has(trimmed.toLowerCase())) {
    return STORE_CONTACT_EMAIL;
  }
  return trimmed;
}
