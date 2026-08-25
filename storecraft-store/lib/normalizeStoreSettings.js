import { normalizeHomepageSettings } from "@/lib/defaultHomepageSettings";
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";
import { STORE_POLICY } from "@/config/store-policy";
import {
  sanitizeAnnouncementItems,
  sanitizeCustomerShippingNote,
  standardDeliveryFeeShort,
  standardDeliveryFeeStatement,
} from "@/lib/storePolicyCopy";

export const DEFAULT_ANNOUNCEMENT_BAR = {
  enabled: true,
  items: [
    { text: "Cash on Delivery Available", link: "/shipping-policy", enabled: true },
    { text: standardDeliveryFeeShort(), link: "/shipping-policy", enabled: true },
  ],
  backgroundColor: "#111111",
  textColor: "#FFFFFF",
};

export const DEFAULT_TRUST_BADGES = {
  enabled: false,
  items: [],
};

export const DEFAULT_BRAND_STORY = {
  enabled: true,
  badge: "Our Story",
  heading: "Built for Pakistani Car Enthusiasts",
  subheading: "Fitment-first car accessories from Gujranwala",
  description:
    "Crazzycars.pk is based in Gujranwala and ships car accessories nationwide — splitters, LED lighting, body kits, carbon fiber parts, and more. We focus on clear year compatibility, practical installs, and Cash on Delivery.",
  buttonText: "About Us",
  buttonLink: "/about",
  image1: "",
  image2: "",
  stats: [
    { value: "393+", label: "Active products" },
    { value: "COD", label: "Nationwide" },
  ],
};

export const DEFAULT_APPEARANCE = {
  primaryColor: "#C41E1E",
  secondaryColor: "#111111",
  accentColor: "#C41E1E",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  buttonStyle: "rounded",
  borderRadius: "8px",
};

/** Reject CSS-breaking values before ThemeInjector injects them into :root. */
export function sanitizeCssColor(value, fallback) {
  const s = String(value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return s;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(s)) {
    return s;
  }
  if (/^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(s)) {
    return s;
  }
  return fallback;
}

export function sanitizeCssLength(value, fallback) {
  const s = String(value || "").trim();
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(s)) return s;
  return fallback;
}

export function sanitizeCssFontFamily(value, fallback) {
  const s = String(value || "").trim();
  // Allow CSS var() stacks and simple quoted/unquoted family lists — no braces/semicolons.
  if (!s || /[{};<>]/.test(s)) return fallback;
  if (s.length > 160) return fallback;
  return s;
}

export const DEFAULT_CHECKOUT_MESSAGES = {
  orderSuccessMessage: "Order Placed! We will deliver to your doorstep.",
  orderSuccessSubtext: "Thank you for shopping with Crazzycars.pk",
  codInstructions: "Pay cash when your order arrives.",
  shippingNote: standardDeliveryFeeStatement(),
  cartEmptyMessage: "Your cart is empty",
  paymentConfirmedMessage:
    "Your payment has been confirmed. Please send a screenshot of your full payment to our WhatsApp at {whatsapp} for confirmation, and our team will begin processing your order.",
  codAdvanceNote:
    "Thank you for your order! Since this is a Cash on Delivery order, please send a screenshot of your advance payment to our WhatsApp at {whatsapp} to confirm your booking. The remaining balance will be collected on delivery.",
};

export const DEFAULT_STORE_PAYMENT = {
  codEnabled: true,
  codLabel: "Cash on Delivery",
  codDescription: "Pay when your order arrives at your doorstep.",
  codFee: 0,
  minimumOrderAmount: 0,
  freeShippingThreshold: 0,
  freeShippingOnAdvancePayment: false,
  freeShippingOnOrderAbove: 0,
  freeShippingOnOrderAboveEnabled: false,
  advancePaymentMessage:
    "Your order is placed. Please pay delivery charges of {amount} in advance and send the screenshot on WhatsApp: {whatsapp}",
  advancePaymentAmount: STORE_POLICY.shipping.standardFeePKR,
  advancePaymentMessageEnabled: true,
  advancePaymentMessageTitle: "Next step — confirm delivery",
  advancePaymentDiscountEnabled: true,
  advancePaymentDiscountPercent: 3,
  flatDeliveryCharge: STORE_POLICY.shipping.standardFeePKR,
};

export const DEFAULT_PRODUCT_BADGE_UI = {
  enabled: true,
  showSaleBadge: true,
  showNewBadge: true,
  showCodBadge: false,
  saleBadgeText: "Sale",
  newBadgeText: "New",
  saleBadgeColor: "#C41E1E",
  newBadgeColor: "#111111",
  codBadgeText: "Cash on delivery",
  codBadgeColor: "#6B7280",
};

const DEFAULT_NAV = [
  { label: "Home", href: "/", mega: false },
  { label: "Shop", href: "/shop", mega: true },
  { label: "Categories", href: "/categories", mega: true },
  { label: "Exterior", href: "/categories/exterior", mega: false },
  { label: "Interior", href: "/categories/interior", mega: false },
  { label: "Lighting", href: "/categories/car-lighting", mega: false },
  { label: "Car Care", href: "/categories/car-care", mega: false },
  { label: "Deals", href: "/shop?deals=1", mega: false, deals: true },
  { label: "Blog", href: "/blogs", mega: false },
];

function imageUrlFromField(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    const u = v.url ?? v.secure_url ?? v.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

export function normalizeBrandStory(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRAND_STORY };
  const stats =
    Array.isArray(raw.stats) && raw.stats.length > 0
      ? raw.stats.map((s) => ({
          value: String(s?.value ?? ""),
          label: String(s?.label ?? ""),
        }))
      : DEFAULT_BRAND_STORY.stats;
  return {
    ...DEFAULT_BRAND_STORY,
    ...raw,
    enabled: raw.enabled !== false,
    image1: imageUrlFromField(raw.image1),
    image2: imageUrlFromField(raw.image2),
    stats,
  };
}

export function normalizeAppearance(raw, seo = {}) {
  const a = raw && typeof raw === "object" ? raw : {};
  const primaryColor = sanitizeCssColor(a.primaryColor, DEFAULT_APPEARANCE.primaryColor);
  const secondaryColor = sanitizeCssColor(a.secondaryColor, DEFAULT_APPEARANCE.secondaryColor);
  const accentColor = sanitizeCssColor(
    a.accentColor || a.primaryColor,
    DEFAULT_APPEARANCE.accentColor
  );
  return {
    ...DEFAULT_APPEARANCE,
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily: sanitizeCssFontFamily(a.fontFamily, DEFAULT_APPEARANCE.fontFamily),
    buttonStyle: a.buttonStyle || DEFAULT_APPEARANCE.buttonStyle,
    borderRadius: sanitizeCssLength(a.borderRadius, DEFAULT_APPEARANCE.borderRadius),
    themeDefault: seo.themeDefault || "light",
  };
}

export function normalizeCheckoutMessages(raw, storefront = {}) {
  const cx = storefront?.checkoutSuccess || {};
  const m = raw && typeof raw === "object" ? raw : {};
  return {
    orderSuccessMessage:
      m.orderSuccessMessage?.trim() ||
      cx.successTitle?.trim() ||
      cx.title?.trim() ||
      DEFAULT_CHECKOUT_MESSAGES.orderSuccessMessage,
    orderSuccessSubtext:
      m.orderSuccessSubtext?.trim() ||
      cx.successMessage?.trim() ||
      cx.thankYouMessage?.trim() ||
      DEFAULT_CHECKOUT_MESSAGES.orderSuccessSubtext,
    codInstructions: m.codInstructions?.trim() || DEFAULT_CHECKOUT_MESSAGES.codInstructions,
    shippingNote: sanitizeCustomerShippingNote(
      m.shippingNote?.trim() || DEFAULT_CHECKOUT_MESSAGES.shippingNote
    ),
    cartEmptyMessage: m.cartEmptyMessage?.trim() || DEFAULT_CHECKOUT_MESSAGES.cartEmptyMessage,
    failedTitle: cx.failedTitle?.trim() || "Payment Failed",
    failedMessage: cx.failedMessage?.trim() || "Your payment could not be processed.",
    paymentConfirmedMessage:
      cx.paymentConfirmedMessage?.trim() || DEFAULT_CHECKOUT_MESSAGES.paymentConfirmedMessage,
    codAdvanceNote: cx.codAdvanceNote?.trim() || DEFAULT_CHECKOUT_MESSAGES.codAdvanceNote,
    footerMessage: cx.footerMessage?.trim() || "",
    emailSubject: cx.emailSubject?.trim() || "",
    emailMessage: cx.emailMessage?.trim() || "",
  };
}

export function normalizeStorePayment(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    codEnabled: p.codEnabled !== false,
    codLabel: p.codLabel?.trim() || DEFAULT_STORE_PAYMENT.codLabel,
    codDescription: p.codDescription?.trim() || DEFAULT_STORE_PAYMENT.codDescription,
    codFee: Number(p.codFee) || 0,
    minimumOrderAmount: Number(p.minimumOrderAmount) || 0,
    freeShippingThreshold: 0,
    freeShippingOnAdvancePayment: false,
    freeShippingOnOrderAbove: 0,
    freeShippingOnOrderAboveEnabled: false,
    advancePaymentAmount:
      Number(p.advancePaymentAmount) || STORE_POLICY.shipping.standardFeePKR,
    advancePaymentMessageEnabled:
      p.advancePaymentMessageEnabled !== undefined
        ? Boolean(p.advancePaymentMessageEnabled)
        : DEFAULT_STORE_PAYMENT.advancePaymentMessageEnabled,
    advancePaymentMessageTitle:
      p.advancePaymentMessageTitle?.trim() || DEFAULT_STORE_PAYMENT.advancePaymentMessageTitle,
    advancePaymentMessage:
      p.advancePaymentMessage?.trim() || DEFAULT_STORE_PAYMENT.advancePaymentMessage,
    advancePaymentDiscountEnabled:
      p.advancePaymentDiscountEnabled !== undefined
        ? Boolean(p.advancePaymentDiscountEnabled)
        : DEFAULT_STORE_PAYMENT.advancePaymentDiscountEnabled,
    advancePaymentDiscountPercent: Math.min(
      100,
      Math.max(0, Number(p.advancePaymentDiscountPercent) || DEFAULT_STORE_PAYMENT.advancePaymentDiscountPercent)
    ),
    flatDeliveryCharge: STORE_POLICY.shipping.standardFeePKR,
  };
}

export function normalizeProductBadgeUi(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PRODUCT_BADGE_UI };
  }
  const master = raw.enabled !== false;
  return {
    enabled: master,
    showSaleBadge: raw.showSaleBadge !== false && master,
    showNewBadge: raw.showNewBadge !== false && master,
    showCodBadge: false,
    saleBadgeText: raw.saleBadgeText?.trim() || DEFAULT_PRODUCT_BADGE_UI.saleBadgeText,
    newBadgeText: raw.newBadgeText?.trim() || DEFAULT_PRODUCT_BADGE_UI.newBadgeText,
    saleBadgeColor: raw.saleBadgeColor?.trim() || DEFAULT_PRODUCT_BADGE_UI.saleBadgeColor,
    newBadgeColor: raw.newBadgeColor?.trim() || DEFAULT_PRODUCT_BADGE_UI.newBadgeColor,
    codBadgeText: raw.codBadgeText?.trim() || DEFAULT_PRODUCT_BADGE_UI.codBadgeText,
    codBadgeColor: raw.codBadgeColor?.trim() || DEFAULT_PRODUCT_BADGE_UI.codBadgeColor,
    raw,
  };
}

function normalizeMegaMenuItem(item) {
  const columns = Array.isArray(item?.columns)
    ? item.columns
        .map((col) => ({
          heading: String(col?.heading || col?.title || "").trim(),
          links: (Array.isArray(col?.links) ? col.links : [])
            .filter((l) => String(l?.label || "").trim())
            .map((l) => ({
              label: String(l.label).trim(),
              href: String(l.url || l.href || "#").trim() || "#",
            })),
        }))
        .filter((c) => c.heading || c.links.length)
    : [];
  return {
    label: String(item?.label || "").trim(),
    href: String(item?.url || item?.href || "/").trim() || "/",
    featured: item?.featured === true,
    mega: item?.mega !== false && columns.length > 0,
    deals: /deal/i.test(String(item?.label || "")),
    columns,
  };
}

export function normalizeMegaMenu(raw) {
  const m = raw && typeof raw === "object" ? raw : {};
  const items = Array.isArray(m.items) && m.items.length
    ? m.items.map(normalizeMegaMenuItem).filter((i) => i.label)
    : DEFAULT_NAV.map((i) => ({
        ...i,
        columns: [],
      }));
  return {
    enabled: m.enabled !== false,
    trigger: m.trigger === "click" ? "click" : "hover",
    showImages: m.showImages !== false,
    showSubcategories: m.showSubcategories !== false,
    columns: Number(m.columns) || 4,
    featuredTitle: m.featuredTitle || "Shop By Category",
    items,
  };
}

export function normalizeTrustBadges(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TRUST_BADGES };
  }
  const items = Array.isArray(raw.items)
    ? raw.items.map((b) => ({
        icon: String(b?.icon || "").trim(),
        title: String(b?.title || "").trim(),
        description: String(b?.description || b?.subtitle || "").trim(),
        enabled: b?.enabled !== false,
      }))
    : DEFAULT_TRUST_BADGES.items;
  return {
    enabled: raw.enabled !== false,
    items: items.length ? items : DEFAULT_TRUST_BADGES.items,
  };
}

/** Build full storefront settings payload from raw Mongo document. */
export function buildStoreSettingsPayload(settings = {}) {
  const g = settings.general || {};
  const logoString =
    (typeof g.logoUrl === "string" ? g.logoUrl.trim() : "") ||
    (typeof g.logo === "string" ? g.logo : g.logo?.url) ||
    "";
  const faviconString =
    (typeof g.faviconUrl === "string" ? g.faviconUrl.trim() : "") ||
    (typeof g.favicon === "string" ? g.favicon : g.favicon?.url) ||
    "";
  const f = settings.footer || {};
  const wa = settings.whatsapp || {};
  const checkoutSuccess = settings.storefront?.checkoutSuccess || settings.checkoutSuccess || {};
  const announcementBarRaw = settings?.announcementBar || DEFAULT_ANNOUNCEMENT_BAR;
  const announcementBar = {
    ...announcementBarRaw,
    items: sanitizeAnnouncementItems(announcementBarRaw.items || DEFAULT_ANNOUNCEMENT_BAR.items),
  };
  const trustBadges = normalizeTrustBadges(settings?.trustBadges);
  const brandStory = normalizeBrandStory(settings?.brandStory);
  const homepageSettings = normalizeHomepageSettings(settings?.homepageSettings);
  const appearance = normalizeAppearance(settings?.appearance, settings?.seo);
  const checkoutMessages = normalizeCheckoutMessages(settings?.checkoutMessages, settings?.storefront);
  const storePayment = normalizeStorePayment(settings?.storePayment);
  const productBadgeUi = normalizeProductBadgeUi(settings?.productBadges);
  const productImageWatermark = normalizeProductImageWatermark(settings?.productImageWatermark);
  const megaMenu = normalizeMegaMenu(settings?.megaMenu);

  const defaultCheckout = {
    requireAccount: false,
    allowGuestCheckout: true,
    showLoginPrompt: true,
  };
  const checkoutRaw = settings?.checkout && typeof settings.checkout === "object" ? settings.checkout : {};
  const checkout = {
    ...defaultCheckout,
    ...checkoutRaw,
    requireAccount: checkoutRaw.requireAccount === true,
    allowGuestCheckout: checkoutRaw.allowGuestCheckout !== false,
    showLoginPrompt: checkoutRaw.showLoginPrompt !== false,
  };

  const general = {
    ...(typeof settings?.general === "object" && settings.general ? settings.general : {}),
    logo: logoString,
    logoUrl: logoString,
    favicon: faviconString,
    faviconUrl: faviconString,
    showStoreName: g.showStoreName !== false,
    address: g.address?.trim() || f.registeredAddress?.trim() || f.contact?.address?.trim() || "",
  };

  const data = {
    announcementBar,
    homepageSettings,
    trustBadges,
    brandStory,
    appearance,
    checkoutMessages,
    storePayment,
    productBadges: settings?.productBadges ?? null,
    productBadgeUi,
    productImageWatermark,
    megaMenu,
    general,
    payment: settings?.payment || {},
    pakistaniPaymentMethods: normalizePakistaniPaymentMethods(settings?.pakistaniPaymentMethods),
    seo: settings?.seo && typeof settings.seo === "object" ? settings.seo : {},
    emailTemplates: settings?.emailTemplates || {},
    notifications: settings?.notifications || {},
    footer: {
      ...(typeof settings?.footer === "object" && settings.footer ? settings.footer : {}),
      copyrightText: f.copyrightText || "",
      tagline: f.tagline || "",
      contactEmail: f.contactEmail || f.email || f.contact?.email || "",
      phone: f.phone || f.contact?.phone || "",
      paymentMethods: Array.isArray(f.paymentMethods) ? f.paymentMethods : [],
      shopLinks: Array.isArray(f.shopLinks) ? f.shopLinks : [],
      customerCareLinks: Array.isArray(f.customerCareLinks) ? f.customerCareLinks : [],
      categoriesLinks: Array.isArray(f.categoriesLinks) ? f.categoriesLinks : [],
      social: f.social && typeof f.social === "object" ? f.social : {},
      showPaymentIcons: f.showPaymentIcons !== false,
      showLogoInFooter: f.showLogoInFooter !== false,
      companyName: f.companyName || "",
      companyNumber: f.companyNumber || "",
      vatNumber: f.vatNumber || "",
      registeredAddress: f.registeredAddress || "",
      trustpilotUrl: f.trustpilotUrl || "",
    },
    whatsapp: {
      enabled: wa.enabled === true,
      number: wa.number || "",
      message: wa.message || "Hi! I have a question about your accessories.",
      showInNav: wa.showInNav === true,
      showInFooter: wa.showInFooter !== false,
      showFloating: wa.showFloating !== false,
      position: wa.position === "bottom-right" ? "bottom-right" : "bottom-left",
      buttonColor: wa.buttonColor?.trim() || "#25D366",
    },
    checkoutSuccess: checkoutSuccess || {},
    aboutPage: settings?.aboutPage || {},
    contactPage: settings?.contactPage || {},
    storefront: settings?.storefront || {},
    checkout,
    storeName: g.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
    logoUrl: logoString,
    phone: g.phone || "",
    email: g.email || "",
    footerText: g.footerText || "",
    website: g.website || "",
    currency: g.currency || "PKR",
    footerMeta: {
      tagline: f.tagline || "",
      social: f.social || {},
      columns: Array.isArray(f.columns) ? f.columns : [],
      contact: f.contact || {},
      copyrightText: f.copyrightText || "",
      newsletter: f.newsletter || {
        enabled: true,
        heading: "Get Exclusive Car Accessories Deals",
        subtext: "Get the Latest Deals",
        buttonText: "Subscribe",
      },
      paymentMethods: Array.isArray(f.paymentMethods) ? f.paymentMethods : [],
      appLinks: f.appLinks || {},
      showPaymentIcons: f.showPaymentIcons !== false,
    },
    whatsappNormalized: {
      enabled: wa.enabled === true,
      number: wa.number || "",
      message: wa.message || "Hi! I have a question about your accessories.",
      showInNav: wa.showInNav === true,
      showInFooter: wa.showInFooter !== false,
      showFloating: wa.showFloating !== false,
      position: wa.position === "bottom-right" ? "bottom-right" : "bottom-left",
      buttonColor: wa.buttonColor?.trim() || "#25D366",
    },
  };

  return data;
}

/**
 * Strip secrets and heavy blobs before sending settings to the browser.
 * Keeps only what storefront UI needs.
 */
export function toPublicClientSettings(full = {}) {
  const payment = full.payment && typeof full.payment === "object" ? full.payment : {};
  const stripe = payment.stripe && typeof payment.stripe === "object" ? payment.stripe : {};
  const paypal = payment.paypal && typeof payment.paypal === "object" ? payment.paypal : {};

  return {
    announcementBar: full.announcementBar,
    homepageSettings: full.homepageSettings,
    trustBadges: full.trustBadges,
    brandStory: full.brandStory,
    appearance: full.appearance,
    checkoutMessages: full.checkoutMessages,
    storePayment: full.storePayment,
    productBadges: full.productBadges ?? null,
    productBadgeUi: full.productBadgeUi,
    productImageWatermark: full.productImageWatermark,
    megaMenu: full.megaMenu,
    general: {
      storeName: full.general?.storeName || full.storeName || "",
      logo: full.general?.logo || full.logoUrl || "",
      logoUrl: full.general?.logoUrl || full.logoUrl || "",
      favicon: full.general?.favicon || "",
      faviconUrl: full.general?.faviconUrl || "",
      showStoreName: full.general?.showStoreName !== false,
      phone: full.general?.phone || full.phone || "",
      email: full.general?.email || full.email || "",
      address: full.general?.address || "",
      currency: full.general?.currency || full.currency || "PKR",
      website: full.general?.website || full.website || "",
    },
    payment: {
      stripe: {
        enabled: stripe.enabled === true,
        publishableKey: String(stripe.publishableKey || "").trim(),
      },
      paypal: {
        enabled: paypal.enabled === true,
        clientId: String(paypal.clientId || "").trim(),
        mode: paypal.mode || "sandbox",
      },
    },
    pakistaniPaymentMethods: full.pakistaniPaymentMethods,
    seo: {
      googleAnalyticsId: full.seo?.googleAnalyticsId || "",
      facebookPixelId: full.seo?.facebookPixelId || "",
      metaTitle: full.seo?.metaTitle || "",
      metaDescription: full.seo?.metaDescription || "",
    },
    footer: full.footer,
    whatsapp: full.whatsapp,
    checkoutSuccess: full.checkoutSuccess || {},
    checkout: full.checkout,
    storeName: full.storeName,
    logoUrl: full.logoUrl,
    phone: full.phone,
    email: full.email,
    footerText: full.footerText || "",
    website: full.website || "",
    currency: full.currency || "PKR",
    footerMeta: full.footerMeta,
    whatsappNormalized: full.whatsappNormalized,
  };
}

