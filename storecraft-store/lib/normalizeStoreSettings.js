import { normalizeHomepageSettings } from "@/lib/defaultHomepageSettings";
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";

export const DEFAULT_ANNOUNCEMENT_BAR = {
  enabled: true,
  items: [
    { text: "Free Delivery on Orders Over Rs. 2,999", link: "", enabled: true },
    { text: "Cash on Delivery Available", link: "", enabled: true },
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
  subheading: "Pakistan's Car Accessories Store",
  description:
    "Crazzycars.pk is based in Gujranwala and ships premium car accessories nationwide — splitters, LED lighting, body kits, carbon fiber parts, and more.",
  buttonText: "About Us",
  buttonLink: "/about",
  image1: "",
  image2: "",
  stats: [],
};

export const DEFAULT_APPEARANCE = {
  primaryColor: "#C41E1E",
  secondaryColor: "#111111",
  accentColor: "#C41E1E",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  buttonStyle: "rounded",
  borderRadius: "8px",
};

export const DEFAULT_CHECKOUT_MESSAGES = {
  orderSuccessMessage: "Order Placed! We will deliver to your doorstep.",
  orderSuccessSubtext: "Thank you for shopping with Crazzycars.pk",
  codInstructions: "Pay cash when your order arrives.",
  shippingNote: "Free delivery on orders over Rs. 2,999",
  cartEmptyMessage: "Your cart is empty",
};

export const DEFAULT_STORE_PAYMENT = {
  codEnabled: true,
  codLabel: "Cash on Delivery",
  codDescription: "Pay when your order arrives at your doorstep.",
  codFee: 0,
  minimumOrderAmount: 0,
  freeShippingThreshold: 2999,
  freeShippingOnAdvancePayment: false,
  freeShippingOnOrderAbove: 10000,
  freeShippingOnOrderAboveEnabled: false,
  advancePaymentMessage:
    "To confirm your order, please pay delivery charges of {amount} in advance.\n\nSend payment screenshot on WhatsApp: {whatsapp}",
  advancePaymentAmount: 250,
  advancePaymentMessageEnabled: true,
  advancePaymentMessageTitle: "Confirm Your Order",
  advancePaymentDiscountEnabled: true,
  advancePaymentDiscountPercent: 3,
  flatDeliveryCharge: 250,
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
  return {
    ...DEFAULT_APPEARANCE,
    primaryColor: a.primaryColor || DEFAULT_APPEARANCE.primaryColor,
    secondaryColor: a.secondaryColor || DEFAULT_APPEARANCE.secondaryColor,
    accentColor: a.accentColor || a.primaryColor || DEFAULT_APPEARANCE.accentColor,
    fontFamily: a.fontFamily || DEFAULT_APPEARANCE.fontFamily,
    buttonStyle: a.buttonStyle || DEFAULT_APPEARANCE.buttonStyle,
    borderRadius: a.borderRadius || DEFAULT_APPEARANCE.borderRadius,
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
    shippingNote: m.shippingNote?.trim() || DEFAULT_CHECKOUT_MESSAGES.shippingNote,
    cartEmptyMessage: m.cartEmptyMessage?.trim() || DEFAULT_CHECKOUT_MESSAGES.cartEmptyMessage,
    failedTitle: cx.failedTitle?.trim() || "Payment Failed",
    failedMessage: cx.failedMessage?.trim() || "Your payment could not be processed.",
    paymentConfirmedMessage: cx.paymentConfirmedMessage?.trim() || "",
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
    freeShippingThreshold: Number(p.freeShippingThreshold) || DEFAULT_STORE_PAYMENT.freeShippingThreshold,
    freeShippingOnAdvancePayment: p.freeShippingOnAdvancePayment === true,
    freeShippingOnOrderAbove:
      Number(p.freeShippingOnOrderAbove) || DEFAULT_STORE_PAYMENT.freeShippingOnOrderAbove,
    freeShippingOnOrderAboveEnabled: p.freeShippingOnOrderAboveEnabled === true,
    advancePaymentAmount: Number(p.advancePaymentAmount) || DEFAULT_STORE_PAYMENT.advancePaymentAmount,
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
    flatDeliveryCharge: Math.max(
      0,
      Number(p.flatDeliveryCharge) || DEFAULT_STORE_PAYMENT.flatDeliveryCharge
    ),
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
  const f = settings.footer || {};
  const wa = settings.whatsapp || {};
  const checkoutSuccess = settings.storefront?.checkoutSuccess || settings.checkoutSuccess || {};
  const announcementBar = settings?.announcementBar || DEFAULT_ANNOUNCEMENT_BAR;
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
