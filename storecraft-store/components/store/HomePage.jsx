"use client";

import { useMemo } from "react";
import BestSellers from "@/components/home/BestSellers";
import BrandCarousel from "@/components/home/BrandCarousel";
import BrandStory from "@/components/home/BrandStory";
import CategoryGrid from "@/components/home/CategoryGrid";
import HotDeals from "@/components/home/HotDeals";
import HomeHero from "@/components/home/HomeHero";
import ShopByCar from "@/components/home/ShopByCar";
import ShopByVehicle from "@/components/home/ShopByVehicle";
import StatsBar from "@/components/home/StatsBar";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

function mergeHomepageSettings(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_HOMEPAGE_SETTINGS;
  return {
    ...DEFAULT_HOMEPAGE_SETTINGS,
    ...raw,
    sections: { ...DEFAULT_HOMEPAGE_SETTINGS.sections, ...(raw.sections || {}) },
  };
}

/**
 * Homepage — uses SSR settings from context on first paint (no DEFAULT flash).
 * Hero slides come from the server so the front image is in the initial HTML.
 */
export function HomePage({
  initialBestSellers = [],
  initialHotDeals = null,
  initialHeroSlides = null,
}) {
  const ctx = useStoreSettings();

  const homepageSettings = useMemo(
    () => mergeHomepageSettings(ctx?.homepageSettings),
    [ctx?.homepageSettings]
  );
  const brandStory = ctx?.brandStory || null;

  const sectionOrder =
    Array.isArray(homepageSettings.sectionOrder) && homepageSettings.sectionOrder.length
      ? [...homepageSettings.sectionOrder].sort((a, b) => (a.order || 0) - (b.order || 0))
      : DEFAULT_HOMEPAGE_SETTINGS.sectionOrder;
  const sectionEnabled = (id) => sectionOrder.find((s) => s.id === id)?.enabled !== false;

  return (
    <div style={{ background: "var(--color-background)" }}>
      {sectionEnabled("hero") ? (
        <HomeHero settings={homepageSettings} initialSlides={initialHeroSlides} />
      ) : null}
      <StatsBar settings={{ brandStory, stats: homepageSettings?.stats }} />
      {sectionEnabled("shopByCar") && homepageSettings.sections?.showShopByCar !== false ? (
        <ShopByCar title={homepageSettings.sectionTitles?.shopByCar} />
      ) : null}
      {sectionEnabled("categories") && homepageSettings.sections?.showCategories !== false ? (
        <CategoryGrid
          title={homepageSettings.categories?.title || homepageSettings.sectionTitles?.categories}
          viewAllText={homepageSettings.categories?.viewAllText}
        />
      ) : null}
      {sectionEnabled("hotDeals") && homepageSettings.sections?.showHotDeals !== false ? (
        <HotDeals settings={homepageSettings} initialProducts={initialHotDeals} />
      ) : null}
      {sectionEnabled("bestSellers") && homepageSettings.sections?.showBestSellers !== false ? (
        <BestSellers initialProducts={initialBestSellers} settings={homepageSettings} />
      ) : null}
      <ShopByVehicle />
      {sectionEnabled("brands") && homepageSettings.sections?.showBrands !== false ? (
        <BrandCarousel settings={homepageSettings} />
      ) : null}
      {sectionEnabled("whyChooseUs") && homepageSettings.sections?.showWhyChooseUs !== false ? (
        <WhyChooseUs settings={homepageSettings} />
      ) : null}
      <BrandStory story={brandStory} />
    </div>
  );
}

export default HomePage;
