"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import HomeHero from "@/components/home/HomeHero";
import StatsBar from "@/components/home/StatsBar";
import ShopByCar from "@/components/home/ShopByCar";
import CategoryGrid from "@/components/home/CategoryGrid";
import ShopByVehicle from "@/components/home/ShopByVehicle";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

const HotDeals = dynamic(() => import("@/components/home/HotDeals"), {
  loading: () => <SectionSkeleton height={360} />,
});
const BestSellers = dynamic(() => import("@/components/home/BestSellers"), {
  loading: () => <SectionSkeleton height={360} />,
});
const WhyChooseUs = dynamic(() => import("@/components/home/WhyChooseUs"), {
  loading: () => <SectionSkeleton height={380} />,
});

function SectionSkeleton({ height = 240 }) {
  return (
    <div
      className="mx-auto my-3 max-w-7xl animate-pulse rounded-2xl bg-[#f3f4f6] md:my-6"
      style={{ height }}
      aria-hidden
    />
  );
}

function mergeHomepageSettings(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_HOMEPAGE_SETTINGS;
  return {
    ...DEFAULT_HOMEPAGE_SETTINGS,
    ...raw,
    sections: { ...DEFAULT_HOMEPAGE_SETTINGS.sections, ...(raw.sections || {}) },
  };
}

/**
 * Homepage — above-the-fold sections are in the first JS/HTML.
 * Deals / best sellers / story stay code-split.
 */
export function HomePage({
  initialBestSellers = [],
  initialHotDeals = null,
  initialHeroSlides = null,
  initialCarCatalog = null,
  initialCategories = null,
  activeProductCount = null,
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
      <StatsBar
        settings={{ brandStory, stats: homepageSettings?.stats }}
        activeProductCount={activeProductCount}
      />
      {sectionEnabled("shopByCar") && homepageSettings.sections?.showShopByCar !== false ? (
        <ShopByCar
          title={homepageSettings.sectionTitles?.shopByCar}
          initialCatalog={initialCarCatalog}
        />
      ) : null}
      <ShopByVehicle initialCatalog={initialCarCatalog} />
      {sectionEnabled("categories") && homepageSettings.sections?.showCategories !== false ? (
        <CategoryGrid
          title={homepageSettings.categories?.title || homepageSettings.sectionTitles?.categories}
          viewAllText={homepageSettings.categories?.viewAllText}
          categories={initialCategories}
        />
      ) : null}
      {sectionEnabled("hotDeals") && homepageSettings.sections?.showHotDeals !== false ? (
        <HotDeals settings={homepageSettings} initialProducts={initialHotDeals} />
      ) : null}
      {sectionEnabled("bestSellers") && homepageSettings.sections?.showBestSellers !== false ? (
        <BestSellers initialProducts={initialBestSellers} settings={homepageSettings} />
      ) : null}
      {sectionEnabled("whyChooseUs") && homepageSettings.sections?.showWhyChooseUs !== false ? (
        <WhyChooseUs
          story={brandStory}
          heroImage={
            Array.isArray(initialHeroSlides) && initialHeroSlides[0]?.imageUrl
              ? initialHeroSlides[0].imageUrl
              : ""
          }
        />
      ) : null}
    </div>
  );
}
