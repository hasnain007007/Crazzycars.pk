/**
 * Homefy.pk brand copy, category display names, and product-image helpers.
 *
 * Real photography: Admin → Products → edit product → Media. Upload a JPG/WebP
 * (Cloudinary). Cards/PDP use product.image, then images[], then media.images[0].
 * Catalog SVGs under /images/catalog/ are treated as placeholders, not photos.
 */

export const STORE_DISPLAY_NAME = "Homefy.pk";

/** Slugs stay stable so URLs do not change. */
export const CATEGORY_DISPLAY = {
  "kitchen-accessories": {
    label: "Kitchen Accessories",
    blurb: "Cookware, storage, cutlery and dining pieces for everyday cooking.",
  },
  "beauty-bags": {
    label: "Beauty & Travel Bags",
    blurb: "Makeup pouches, toiletry kits and vanity organizers — bags for beauty items, not cosmetics.",
  },
  "ladies-bags": {
    label: "Ladies Bags",
    blurb: "Mini handbags, totes, crossbody bags and clutches.",
  },
};

/** Naming options for the beauty-bags category. Live default is index 0. */
export const BEAUTY_BAGS_NAME_OPTIONS = [
  "Beauty & Travel Bags",
  "Makeup & Toiletry Bags",
  "Pouches & Travel Bags",
];

export function displayCategoryName(slug, fallback = "") {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/categories\//, "")
    .split(/[/?#]/)[0];
  return CATEGORY_DISPLAY[key]?.label || String(fallback || "").trim();
}

export function categoryBlurb(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/categories\//, "")
    .split(/[/?#]/)[0];
  return CATEGORY_DISPLAY[key]?.blurb || "";
}

export function slugFromHref(href) {
  const path = String(href || "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "categories" && parts[1]) return parts[1];
  return parts[parts.length - 1] || "";
}

/**
 * Our Story drafts. Option A is live until a founder picks another.
 * Do not treat founding year / team size / customer counts as facts.
 */
export const STORY_OPTIONS = {
  A: {
    heading: "Packed for home — and for leaving it",
    subheading: "Kitchen tools, travel pouches, and handbags in one checkout.",
    description:
      "Homefy.pk is for the pieces you actually reach for: a pan on the stove, a makeup pouch in a tote, a bag you take out of the house. Kitchen accessories and bags belong together here because Pakistani days do not split into “home shop” and “going-out shop.” Cash on Delivery nationwide.",
  },
  B: {
    heading: "One list for the house and the bag",
    subheading: "Practical everyday essentials — not a department store.",
    description:
      "Some weeks you need better cookware. Some weeks you need a pouch that keeps a vanity from turning into a jumble, or a tote that actually holds the day. We curate kitchen accessories, beauty & travel bags, and ladies bags so those errands stay in one cart.",
  },
  C: {
    heading: "Two kinds of useful, one delivery",
    subheading: "Honest pairing: kitchenware and bags, same COD.",
    description:
      "We sell kitchen accessories and bags under one name because that is what we source well — not because we pretend they are the same product. One cart, one Cash on Delivery, one tracking message. Shop what you need.",
  },
};

export const LIVE_STORY = STORY_OPTIONS.A;

export function isStaleBrandStoryText(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("brings cookware, makeup pouches and ladies handbags") ||
    t.includes("girls' beauty bags") ||
    t.includes("girls’ beauty bags") ||
    t.includes("built for pakistani homes") ||
    /kitchen,\s*beauty bags/.test(t)
  );
}

export function replaceStaleHomefyCopy(text, fallback) {
  if (!String(text || "").trim() || isStaleBrandStoryText(text)) return fallback;
  return text;
}

export function isPlaceholderProductImage(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return true;
  if (u.includes("/images/catalog/")) return true;
  if (u.includes("placeholder")) return true;
  return false;
}

/** Google Merchant taxonomy — not Vehicle Parts (5613). */
export function googleProductCategoryId(product) {
  const blob = [
    product?.categorySlug,
    ...(Array.isArray(product?.categories) ? product.categories.map((c) => c?.slug || c?.name || c) : []),
    product?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/kitchen|cookware|cutlery|dining|serveware|storage/.test(blob)) return "638";
  if (/bag|pouch|clutch|tote|handbag|vanity|toiletry/.test(blob)) return "3032";
  return "166";
}

export const NEEDS_INPUT = {
  address: "[NEEDS INPUT — street, city, Pakistan]",
  phone: "[NEEDS INPUT — WhatsApp / phone]",
  instagram: "[NEEDS INPUT — Instagram URL, e.g. https://instagram.com/homefy.pk]",
  facebook: "[NEEDS INPUT — Facebook page URL]",
  tiktok: "[NEEDS INPUT — TikTok URL]",
  companyNumber: "[NEEDS INPUT — NTN / company registration, if any]",
  registeredAddress: "[NEEDS INPUT — registered business address]",
  foundingYear: "[NEEDS INPUT — founding year, if you want it public]",
  returnDays: "[NEEDS INPUT — confirm return/exchange window in days]",
};
