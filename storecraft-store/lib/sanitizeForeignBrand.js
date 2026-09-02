/**
 * Strip leftover Homefy.pk (and similar template) branding from Settings.
 * A find-replace of "Crazzycars" → "Homefy.pk" produced "Homefy.pk.pk" in copy.
 */
import { returnsTrustBadge, standardDeliveryFeeStatement } from "./storePolicyCopy.js";

export const CANONICAL_STORE_NAME = "Crazzycars.pk";
export const CANONICAL_EMAIL = "info@crazzycars.pk";
export const CANONICAL_WEBSITE = "https://crazzycars.pk";
export const CANONICAL_PHONE = "03284010007";
export const CANONICAL_ADDRESS = "Gujranwala, Punjab, Pakistan";
export const CANONICAL_INSTAGRAM = "https://www.instagram.com/crazzycars.pk";
export const CANONICAL_TIKTOK = "https://www.tiktok.com/@crazzycars.pk";
export const CANONICAL_TAGLINE = "The original performance-parts shop in Gujranwala";
export const CANONICAL_BRAND_SUBHEADING = "Splitters, kits, and carbon accents for Pakistani builds";
/** Blocks any CMS/seed reintroduction of the shared sibling-store template opener. */
const STALE_TEMPLATE_TAGLINE = /fitment[- ]?first/i;

const FOREIGN_BRAND = /homefy/i;
const PLACEHOLDER = /\[FILL IN/i;
const KITCHEN_TAGLINE = /kitchen\s*&\s*beauty/i;

export function looksLikeForeignBrand(value) {
  return FOREIGN_BRAND.test(String(value || ""));
}

export function isTemplatePlaceholder(value) {
  return PLACEHOLDER.test(String(value || ""));
}

/** True for Homefy favicon/wordmark Cloudinary uploads — never rewrite the URL (404). */
function isForeignBrandAssetUrl(value) {
  const s = String(value || "");
  return FOREIGN_BRAND.test(s) && /res\.cloudinary\.com/i.test(s);
}

export function replaceForeignBrandString(value) {
  if (typeof value !== "string") return value;
  if (isForeignBrandAssetUrl(value)) return "";
  if (KITCHEN_TAGLINE.test(value) || STALE_TEMPLATE_TAGLINE.test(value)) return CANONICAL_TAGLINE;

  let s = value;
  s = s.replace(/https?:\/\/(?:www\.)?homefy\.pk(?:\.pk)?/gi, CANONICAL_WEBSITE);
  s = s.replace(/instagram\.com\/\s*Homefy\.pk(?:\.pk)?/gi, "instagram.com/crazzycars.pk");
  s = s.replace(/tiktok\.com\/@Homefy\.pk(?:\.pk)?/gi, "tiktok.com/@crazzycars.pk");
  s = s.replace(/[A-Za-z0-9._%+-]*@homefy\.pk(?:\.pk)?/gi, CANONICAL_EMAIL);
  s = s.replace(/Homefy\.pk\.pk/g, CANONICAL_STORE_NAME);
  s = s.replace(/homefy\.pk\.pk/gi, CANONICAL_STORE_NAME);
  s = s.replace(/Homefy\.pk/g, CANONICAL_STORE_NAME);
  s = s.replace(/homefy\.pk/gi, "crazzycars.pk");
  s = s.replace(/\bHomefy\b/g, "Crazzycars");
  s = s.replace(/\bhomefy\b/gi, "Crazzycars");
  return s;
}

export function sanitizeStoreName(name) {
  const s = String(name || "").trim();
  if (!s || looksLikeForeignBrand(s) || isTemplatePlaceholder(s)) {
    return CANONICAL_STORE_NAME;
  }
  const next = replaceForeignBrandString(s).trim();
  return next || CANONICAL_STORE_NAME;
}

export function sanitizeStoreEmail(email) {
  const s = String(email || "").trim();
  if (!s || looksLikeForeignBrand(s) || /@homefy/i.test(s)) return CANONICAL_EMAIL;
  return replaceForeignBrandString(s);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Date) return false;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return false;
  if (value._bsontype) return false;
  return true;
}

function mutateStrings(node) {
  if (typeof node === "string") return replaceForeignBrandString(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const item = node[i];
      if (typeof item === "string") node[i] = replaceForeignBrandString(item);
      else if (item && typeof item === "object") mutateStrings(item);
    }
    return node;
  }
  if (!isPlainObject(node)) return node;
  for (const [key, value] of Object.entries(node)) {
    if (key === "_id" || key === "__v" || key === "password") continue;
    if (typeof value === "string") node[key] = replaceForeignBrandString(value);
    else if (value && typeof value === "object") mutateStrings(value);
  }
  return node;
}

function applyCanonicalFieldFixes(settings) {
  if (!settings || typeof settings !== "object") return settings;

  const general = settings.general && typeof settings.general === "object" ? settings.general : {};
  general.storeName = sanitizeStoreName(general.storeName);
  general.email = sanitizeStoreEmail(general.email);
  if (isTemplatePlaceholder(general.phone) || !String(general.phone || "").trim()) {
    general.phone = CANONICAL_PHONE;
  }
  if (isTemplatePlaceholder(general.address) || !String(general.address || "").trim()) {
    general.address = CANONICAL_ADDRESS;
  }
  if (!String(general.website || "").trim() || looksLikeForeignBrand(general.website)) {
    general.website = CANONICAL_WEBSITE;
  }
  if (looksLikeForeignBrand(general.faviconUrl) || looksLikeForeignBrand(general.favicon?.url) || looksLikeForeignBrand(general.favicon?.publicId)) {
    general.faviconUrl = "";
    general.favicon = { url: "", publicId: "" };
  }
  settings.general = general;

  const footer = settings.footer && typeof settings.footer === "object" ? settings.footer : null;
  if (footer) {
    if (!footer.companyName || looksLikeForeignBrand(footer.companyName)) {
      footer.companyName = CANONICAL_STORE_NAME;
    }
    if (
      !footer.tagline ||
      KITCHEN_TAGLINE.test(footer.tagline) ||
      looksLikeForeignBrand(footer.tagline) ||
      STALE_TEMPLATE_TAGLINE.test(footer.tagline)
    ) {
      footer.tagline = CANONICAL_TAGLINE;
    }
    footer.contactEmail = sanitizeStoreEmail(footer.contactEmail);
    footer.email = sanitizeStoreEmail(footer.email);
    if (footer.contact && typeof footer.contact === "object") {
      footer.contact.email = sanitizeStoreEmail(footer.contact.email);
    }
    if (footer.social && typeof footer.social === "object") {
      if (looksLikeForeignBrand(footer.social.instagram) || !String(footer.social.instagram || "").trim()) {
        footer.social.instagram = CANONICAL_INSTAGRAM;
      }
      if (looksLikeForeignBrand(footer.social.tiktok) || !String(footer.social.tiktok || "").trim()) {
        footer.social.tiktok = CANONICAL_TIKTOK;
      }
    }
  }

  const footerMeta = settings.footerMeta && typeof settings.footerMeta === "object" ? settings.footerMeta : null;
  if (footerMeta) {
    if (
      !footerMeta.tagline ||
      KITCHEN_TAGLINE.test(footerMeta.tagline) ||
      looksLikeForeignBrand(footerMeta.tagline) ||
      STALE_TEMPLATE_TAGLINE.test(footerMeta.tagline)
    ) {
      footerMeta.tagline = CANONICAL_TAGLINE;
    }
  }

  const contactPage = settings.contactPage;
  if (contactPage && typeof contactPage === "object") {
    contactPage.email = sanitizeStoreEmail(contactPage.email);
    const hours = contactPage.hours;
    if (hours && typeof hours === "object" && (/GMT/i.test(hours.weekdays || "") || /GMT/i.test(hours.weekend || ""))) {
      contactPage.hours = {
        weekdays: "Monday - Saturday: 9am - 9pm PKT",
        weekend: "Sunday: 10am - 6pm PKT",
        closed: "Sunday: Closed",
      };
    }
    if (contactPage.socialLinks && typeof contactPage.socialLinks === "object") {
      const sl = contactPage.socialLinks;
      if (looksLikeForeignBrand(sl.instagram) || !String(sl.instagram || "").trim()) {
        sl.instagram = CANONICAL_INSTAGRAM;
      }
      if (looksLikeForeignBrand(sl.tiktok) || !String(sl.tiktok || "").trim()) {
        sl.tiktok = CANONICAL_TIKTOK;
      }
    }
  }

  const watermark = settings.productImageWatermark;
  if (watermark && typeof watermark === "object") {
    if (!watermark.text || looksLikeForeignBrand(watermark.text)) {
      watermark.text = CANONICAL_STORE_NAME;
    }
  }

  const payments = settings.pakistaniPaymentMethods;
  if (payments && typeof payments === "object") {
    if (payments.jazzcash && looksLikeForeignBrand(payments.jazzcash.accountName)) {
      payments.jazzcash.accountName = CANONICAL_STORE_NAME;
    }
    if (payments.easypaisa && looksLikeForeignBrand(payments.easypaisa.accountName)) {
      payments.easypaisa.accountName = CANONICAL_STORE_NAME;
    }
    if (payments.bankTransfer && looksLikeForeignBrand(payments.bankTransfer.accountTitle)) {
      payments.bankTransfer.accountTitle = CANONICAL_STORE_NAME;
    }
  }

  if (settings.invoice && looksLikeForeignBrand(settings.invoice.bankAccountTitle)) {
    settings.invoice.bankAccountTitle = CANONICAL_STORE_NAME;
  }

  const brandStory = settings.brandStory;
  if (brandStory && typeof brandStory === "object") {
    if (!brandStory.subheading || STALE_TEMPLATE_TAGLINE.test(brandStory.subheading)) {
      brandStory.subheading = CANONICAL_BRAND_SUBHEADING;
    }
  }

  const aboutHero = settings.aboutPage?.hero;
  if (aboutHero && typeof aboutHero === "object") {
    if (!aboutHero.title || STALE_TEMPLATE_TAGLINE.test(aboutHero.title)) {
      aboutHero.title = CANONICAL_TAGLINE;
    }
  }

  const trustBadges = settings.productBadges?.trustBadges;
  if (Array.isArray(trustBadges)) {
    const returns = returnsTrustBadge();
    for (const badge of trustBadges) {
      if (!badge || typeof badge !== "object") continue;
      const blob = `${badge.text || ""} ${badge.subtext || ""}`;
      if (/\d+\s*day returns/i.test(blob) || /hassle[\s-]*free/i.test(blob)) {
        badge.text = returns.text;
        badge.subtext = returns.subtext;
      }
    }
  }

  const why = settings.homepageSettings?.whyChooseUs;
  if (Array.isArray(why)) {
    for (const item of why) {
      if (!item || typeof item !== "object") continue;
      const blob = `${item.title || ""} ${item.description || ""}`;
      if (/no questions asked/i.test(blob) || /hassle[\s-]*free/i.test(blob)) {
        item.title = "Returns, done honestly";
        item.description = "Refund if defective or wrong — exchange if you change your mind";
      }
    }
  }

  const faqs = settings.aboutPage?.faq;
  if (Array.isArray(faqs)) {
    for (const item of faqs) {
      if (!item || typeof item !== "object") continue;
      const question = String(item.question || "");
      const answer = String(item.answer || "");
      if (/free[\s-]+deliver/i.test(answer)) {
        item.answer = `Yes. We deliver nationwide from Gujranwala. ${standardDeliveryFeeStatement()} Lahore typically arrives in 2–3 business days; other cities are confirmed at checkout.`;
      }
      if (/return policy/i.test(question) && (/30 days/i.test(answer) || looksLikeForeignBrand(answer))) {
        item.answer =
          "Within our returns window: full refund if the item arrived defective or we shipped the wrong item. Change-of-mind requests are exchange-only (not a cash refund). Message us on WhatsApp or email info@crazzycars.pk to start a claim.";
      }
    }
  }

  return settings;
}

function stripForeignBrandAssets(settings) {
  const general = settings?.general;
  if (!general || typeof general !== "object") return;
  if (looksLikeForeignBrand(general.faviconUrl) || isForeignBrandAssetUrl(general.faviconUrl)) {
    general.faviconUrl = "";
  }
  if (general.favicon && typeof general.favicon === "object") {
    if (
      looksLikeForeignBrand(general.favicon.url) ||
      looksLikeForeignBrand(general.favicon.publicId) ||
      isForeignBrandAssetUrl(general.favicon.url)
    ) {
      general.favicon.url = "";
      general.favicon.publicId = "";
    }
  }
}

/** Mutate a Settings document (plain object or mongoose lean) in place. */
export function mutateSettingsInPlace(settings) {
  stripForeignBrandAssets(settings);
  mutateStrings(settings);
  return applyCanonicalFieldFixes(settings);
}

/** Clone + sanitize for JSON API responses. */
export function sanitizeSettingsDocument(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const clone = JSON.parse(JSON.stringify(raw));
  return mutateSettingsInPlace(clone);
}
