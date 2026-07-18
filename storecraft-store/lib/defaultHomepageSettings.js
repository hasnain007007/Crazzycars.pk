export const DEFAULT_HOMEPAGE_SETTINGS = {
  announcementMessages: [
    { text: "Free delivery on orders over Rs. 2,999 — Pakistan wide", isActive: true },
    { text: "Cash on delivery available at checkout", isActive: true },
    { text: "Crazzycars.pk — Trusted by 10,000+ customers", isActive: true },
  ],
  announcementBgColor: "#111111",
  heroHeadline: "UPGRADE YOUR RIDE.",
  heroSubtext:
    "Premium car accessories delivered across Pakistan. Quality products for every make and model.",
  heroCtaText: "Shop Now",
  heroCtaUrl: "/shop",
  whyChooseUs: [
    { icon: "🚚", title: "We Deliver Everywhere", description: "From Karachi to Khyber — COD nationwide", isActive: true },
    { icon: "💰", title: "Pay When It Arrives", description: "Cash on delivery — no card needed", isActive: true },
    { icon: "🔄", title: "No Hassle Returns", description: "Changed your mind? 7 days, no questions asked", isActive: true },
    { icon: "✅", title: "Real Products, Real Quality", description: "Every item tested before it reaches you", isActive: true },
  ],
  brands: [
    { name: "Honda", isActive: true, order: 0 },
    { name: "Toyota", isActive: true, order: 1 },
    { name: "Suzuki", isActive: true, order: 2 },
    { name: "KIA", isActive: true, order: 3 },
    { name: "Hyundai", isActive: true, order: 4 },
    { name: "MG", isActive: true, order: 5 },
    { name: "Changan", isActive: true, order: 6 },
    { name: "Haval", isActive: true, order: 7 },
    { name: "Isuzu", isActive: true, order: 8 },
    { name: "Audi", isActive: true, order: 9 },
  ],
  flashSaleEnabled: true,
  flashSaleTitle: "Up to 50% Off",
  flashSaleEndTime: null,
  sections: {
    showShopByCar: true,
    showFlashSale: true,
    showBrands: true,
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
    title: "Best Sellers",
    tabs: [{ label: "All", categorySlug: "all", enabled: true, order: 1 }],
  },
  hotDeals: {
    enabled: true,
    title: "🔥 Hot Deals",
    subtitle: "Limited time offers — grab them before they're gone!",
    tabs: [
      { label: "All Deals", filter: "all", enabled: true, order: 1 },
      { label: "Under Rs.1,000", filter: "under1000", enabled: true, order: 2 },
      { label: "Under Rs.700", filter: "under700", enabled: true, order: 3 },
      { label: "50% OFF", filter: "fiftyoff", enabled: true, order: 4 },
      { label: "Flash Deals", filter: "flash", enabled: true, order: 5 },
    ],
  },
  sectionOrder: [
    { id: "hero", label: "Hero Banner", enabled: true, order: 1 },
    { id: "shopByCar", label: "Shop by Car", enabled: true, order: 2 },
    { id: "categories", label: "Categories", enabled: true, order: 3 },
    { id: "bestSellers", label: "Best Sellers", enabled: true, order: 4 },
    { id: "hotDeals", label: "Hot Deals", enabled: true, order: 5 },
    { id: "flashSale", label: "Flash Sale", enabled: true, order: 6 },
    { id: "brands", label: "Brand Carousel", enabled: true, order: 7 },
    { id: "whyChooseUs", label: "Why Choose Us", enabled: true, order: 8 },
  ],
  sectionTitles: {
    categories: "Shop by Category",
    bestSellers: "Best Sellers",
    hotDeals: "🔥 Hot Deals",
    flashSale: "Flash Sale",
    brands: "Trusted Brands",
    whyChooseUs: "Why Choose Us",
    shopByCar: "Find Parts For Your Car",
  },
};

export function normalizeHomepageSettings(raw) {
  const d = DEFAULT_HOMEPAGE_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d };

  return {
    announcementMessages:
      Array.isArray(raw.announcementMessages) && raw.announcementMessages.length
        ? raw.announcementMessages.map((m) => ({
            text: String(m?.text ?? ""),
            isActive: m?.isActive !== false,
          }))
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
    flashSaleEnabled: raw.flashSaleEnabled !== false,
    flashSaleTitle: raw.flashSaleTitle || d.flashSaleTitle,
    flashSaleEndTime: raw.flashSaleEndTime ? new Date(raw.flashSaleEndTime).toISOString() : null,
    sections: {
      showShopByCar: raw.sections?.showShopByCar !== false,
      showFlashSale: raw.sections?.showFlashSale !== false,
      showBrands: raw.sections?.showBrands !== false,
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
          ? raw.hotDeals.tabs.map((t, i) => ({
              label: String(t?.label || ""),
              filter: String(t?.filter || "all"),
              enabled: t?.enabled !== false,
              order: Number.isFinite(Number(t?.order)) ? Number(t.order) : i + 1,
            }))
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
