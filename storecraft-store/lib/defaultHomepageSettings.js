import { looksLikeFreeDeliveryCopy, standardDeliveryFeeShort } from "./storePolicyCopy.js";

export const DEFAULT_HOMEPAGE_SETTINGS = {
  announcementMessages: [
    { text: standardDeliveryFeeShort(), isActive: true },
    { text: "Cash on delivery available at checkout", isActive: true },
  ],
  announcementBgColor: "#111111",
  heroHeadline: "Kitchen, beauty bags & ladies bags",
  heroSubtext:
    "Cookware, makeup pouches and handbags for Pakistani homes — Cash on Delivery nationwide.",
  heroCtaText: "Shop Now",
  heroCtaUrl: "/shop",
  whyChooseUs: [
    { icon: "🚚", title: "Nationwide Delivery", description: "We ship across Pakistan", isActive: true },
    { icon: "💰", title: "Cash on Delivery", description: "Pay when your order arrives", isActive: true },
    { icon: "🔄", title: "Easy Returns", description: "Hassle-free returns on eligible items", isActive: true },
    { icon: "✅", title: "Quality Checked", description: "Products checked before dispatch", isActive: true },
  ],
  brands: [],
  flashSaleEnabled: false,
  flashSaleTitle: "Sale",
  flashSaleEndTime: null,
  sections: {
    showShopByCar: false,
    showFlashSale: false,
    showBrands: false,
    showWhyChooseUs: true,
    showCategories: true,
    showBestSellers: true,
    showHotDeals: true,
  },
  categories: {
    title: "Shop by Category",
    viewAllText: "View all →",
  },
  bestSellers: {
    enabled: true,
    title: "Featured Products",
    productIds: [],
    tabs: [
      { label: "All", categorySlug: "all", enabled: true, order: 1 },
      { label: "Kitchen", categorySlug: "kitchen-accessories", enabled: true, order: 2 },
      { label: "Beauty", categorySlug: "beauty-bags", enabled: true, order: 3 },
      { label: "Ladies", categorySlug: "ladies-bags", enabled: true, order: 4 },
    ],
  },
  hotDeals: {
    enabled: true,
    title: "On Sale",
    subtitle: "Limited-time offers from Homefy.pk",
    tabs: [
      { label: "All Deals", filter: "all", maxPrice: null, enabled: true, order: 1 },
      { label: "Under Rs.1,000", filter: "under1000", maxPrice: 1000, enabled: true, order: 2 },
      { label: "Under Rs.700", filter: "under700", maxPrice: 700, enabled: true, order: 3 },
    ],
  },
  sectionOrder: [
    { id: "hero", label: "Hero Banner", enabled: true, order: 1 },
    { id: "shopByCar", label: "Shop by Car", enabled: false, order: 2 },
    { id: "categories", label: "Categories", enabled: true, order: 3 },
    { id: "bestSellers", label: "Featured Products", enabled: true, order: 4 },
    { id: "hotDeals", label: "On Sale", enabled: true, order: 5 },
    { id: "flashSale", label: "Flash Sale", enabled: false, order: 6 },
    { id: "brands", label: "Brand Carousel", enabled: false, order: 7 },
    { id: "whyChooseUs", label: "Why Choose Us", enabled: true, order: 8 },
  ],
  sectionTitles: {
    categories: "Shop by Category",
    bestSellers: "Featured Products",
    hotDeals: "On Sale",
    flashSale: "Flash Sale",
    brands: "Collections",
    whyChooseUs: "Why Choose Homefy",
    shopByCar: "",
  },
};

export function normalizeHomepageSettings(raw) {
  const d = DEFAULT_HOMEPAGE_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d };

  return {
    announcementMessages:
      Array.isArray(raw.announcementMessages) && raw.announcementMessages.length
        ? raw.announcementMessages.map((m) => {
            const text = String(m?.text ?? "").trim();
            return {
              text: !text || looksLikeFreeDeliveryCopy(text) ? standardDeliveryFeeShort() : text,
              isActive: m?.isActive !== false,
            };
          })
        : d.announcementMessages,
    announcementBgColor: raw.announcementBgColor || d.announcementBgColor,
    heroHeadline: raw.heroHeadline || d.heroHeadline,
    heroSubtext: raw.heroSubtext || d.heroSubtext,
    heroCtaText: raw.heroCtaText || d.heroCtaText,
    heroCtaUrl: raw.heroCtaUrl || d.heroCtaUrl,
    whyChooseUs:
      Array.isArray(raw.whyChooseUs) && raw.whyChooseUs.length
        ? raw.whyChooseUs.map((item) => ({
            icon: String(item?.icon ?? ""),
            title: String(item?.title ?? ""),
            description: String(item?.description ?? ""),
            isActive: item?.isActive !== false,
          }))
        : d.whyChooseUs,
    brands:
      Array.isArray(raw.brands) && raw.brands.length
        ? [...raw.brands]
            .map((b, i) => ({
              name: String(b?.name ?? ""),
              isActive: b?.isActive !== false,
              order: Number.isFinite(Number(b?.order)) ? Number(b.order) : i,
            }))
            .sort((a, b) => a.order - b.order)
        : d.brands,
    flashSaleEnabled: raw.flashSaleEnabled === true,
    flashSaleTitle: raw.flashSaleTitle || d.flashSaleTitle,
    flashSaleEndTime: raw.flashSaleEndTime ? new Date(raw.flashSaleEndTime).toISOString() : null,
    sections: {
      showShopByCar: raw.sections?.showShopByCar === true,
      showFlashSale: raw.sections?.showFlashSale === true,
      showBrands: raw.sections?.showBrands === true,
      showWhyChooseUs: raw.sections?.showWhyChooseUs !== false,
      showCategories: raw.sections?.showCategories !== false,
      showBestSellers: raw.sections?.showBestSellers !== false,
      showHotDeals: raw.sections?.showHotDeals !== false,
    },
    categories: {
      title: raw.categories?.title || raw.sectionTitles?.categories || d.categories.title,
      viewAllText: raw.categories?.viewAllText || d.categories.viewAllText,
    },
    bestSellers: {
      enabled: raw.bestSellers?.enabled !== false,
      title: raw.bestSellers?.title || raw.sectionTitles?.bestSellers || d.bestSellers.title,
      productIds: Array.isArray(raw.bestSellers?.productIds)
        ? raw.bestSellers.productIds.map((id) => String(id)).filter(Boolean)
        : [],
      tabs:
        Array.isArray(raw.bestSellers?.tabs) && raw.bestSellers.tabs.length
          ? raw.bestSellers.tabs.map((t, i) => ({
              label: String(t?.label || ""),
              categorySlug: String(t?.categorySlug || "all"),
              enabled: t?.enabled !== false,
              order: Number.isFinite(Number(t?.order)) ? Number(t.order) : i + 1,
            }))
          : d.bestSellers.tabs,
    },
    hotDeals: {
      enabled: raw.hotDeals?.enabled !== false,
      title: raw.hotDeals?.title || raw.sectionTitles?.hotDeals || d.hotDeals.title,
      subtitle: raw.hotDeals?.subtitle || d.hotDeals.subtitle,
      tabs:
        Array.isArray(raw.hotDeals?.tabs) && raw.hotDeals.tabs.length
          ? raw.hotDeals.tabs.map((t, i) => {
              const maxPrice =
                t?.maxPrice != null && t.maxPrice !== ""
                  ? Number(t.maxPrice)
                  : (() => {
                      const m = String(t?.filter || "").match(/under[_-]?(\d+)/i);
                      return m ? Number(m[1]) : null;
                    })();
              const filter =
                Number.isFinite(maxPrice) && maxPrice > 0
                  ? `under${Math.round(maxPrice)}`
                  : String(t?.filter || "all");
              return {
                label: String(t?.label || ""),
                filter,
                maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? Math.round(maxPrice) : null,
                enabled: t?.enabled !== false,
                order: Number.isFinite(Number(t?.order)) ? Number(t.order) : i + 1,
              };
            })
          : d.hotDeals.tabs,
    },
    sectionOrder:
      Array.isArray(raw.sectionOrder) && raw.sectionOrder.length
        ? raw.sectionOrder
            .filter((s) => s?.id && s.id !== "trust")
            .map((s, i) => ({
              id: String(s?.id || ""),
              label: String(s?.label || ""),
              enabled: s?.enabled !== false,
              order: Number.isFinite(Number(s?.order)) ? Number(s.order) : i + 1,
            }))
        : d.sectionOrder,
    sectionTitles: {
      categories: raw.sectionTitles?.categories || d.sectionTitles.categories,
      bestSellers: raw.sectionTitles?.bestSellers || d.sectionTitles.bestSellers,
      hotDeals: raw.sectionTitles?.hotDeals || d.sectionTitles.hotDeals,
      flashSale: raw.sectionTitles?.flashSale || d.sectionTitles.flashSale,
      brands: raw.sectionTitles?.brands || d.sectionTitles.brands,
      whyChooseUs: raw.sectionTitles?.whyChooseUs || d.sectionTitles.whyChooseUs,
      shopByCar: raw.sectionTitles?.shopByCar || d.sectionTitles.shopByCar,
    },
  };
}
