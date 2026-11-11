/**
 * Google Business Profile NAP — source of truth (owner decision 2026-11-11).
 * Organization JSON-LD, contact page, and footer CALL number use these values.
 * WhatsApp ordering stays on STORE_CONTACT.whatsapp (+92 328 4010007) until the
 * owner standardises — see T-NAP-2 owner question.
 */

export const STORE_NAP = {
  businessName: "CrazzyCars.pk",
  streetAddress: "Block A6, Phase 1, Citi Housing",
  addressLocality: "Gujranwala",
  addressRegion: "Punjab",
  postalCode: "52203",
  addressCountry: "PK",
  latitude: 32.0729838,
  longitude: 74.1939213,
  plusCode: "3GPW+5H Gujranwala",
  /** Shop / Google Business Profile line (CALL). */
  shopPhoneE164: "+923307767799",
  shopPhoneDisplay: "+92 330 7767799",
  shopPhoneLocal: "03307767799",
  /**
   * Opening hours — Open 24 hours, 7 days.
   * schema.org: opens 00:00 / closes 23:59 for each day.
   */
  openingHoursSpec: [
    {
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
  hoursDisplay: "Open 24 hours, 7 days",
  /** Canonical social URLs (must 200; no opaque share links). */
  sameAs: [
    "https://www.facebook.com/crazzycars.pk",
    "https://www.instagram.com/crazzycars.pk",
    "https://www.tiktok.com/@crazzycars.pk",
  ],
  facebookUrl: "https://www.facebook.com/crazzycars.pk",
  mapUrl: "https://g.page/r/CYWo8sid7vn5EBM",
};

/** Digits-only for tel: links (shop line). */
export function storeNapTelHref() {
  return STORE_NAP.shopPhoneE164.replace(/\D/g, "");
}
