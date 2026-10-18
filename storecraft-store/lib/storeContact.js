/** Canonical storefront contact email and default brand name. */
import { BRAND_NAME } from "./brand.js";

export const STORE_DEFAULT_NAME = BRAND_NAME;
export const STORE_CONTACT_EMAIL = "info@crazzycars.pk";

const LEGACY_EMAILS = new Set([
  "support@chaingang.com",
  "support@chaingang.eu",
  "info@thechaingang.eu",
  // Pre-rebrand store emails still stored on footer.contactEmail in some Settings docs
  "sialkotmotorssports@gmail.com",
  "sialkotmotorsports@gmail.com",
  "support@homefy.pk",
  "info@homefy.pk",
  "info@homefy.pk.pk",
]);

/** Normalize legacy support addresses to the single public contact email. */
export function normalizeStoreEmail(email) {
  const trimmed = String(email || "").trim();
  if (!trimmed || LEGACY_EMAILS.has(trimmed.toLowerCase()) || /homefy/i.test(trimmed)) {
    return STORE_CONTACT_EMAIL;
  }
  return trimmed;
}
