"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import HomeHero from "@/components/home/HomeHero";
import StatsBar from "@/components/home/StatsBar";
import CategoryHighlights from "@/components/home/CategoryHighlights";
import LookbookStrip from "@/components/home/LookbookStrip";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { DEFAULT_HOMEPAGE_SETTINGS, normalizeHomepageSettings } from "@/lib/defaultHomepageSettings";

const HotDeals = dynamic(() => import("@/components/home/HotDeals"), {
  loading: () => <SectionSkeleton height={360} />,
});
const BestSellers = dynamic(() => import("@/components/home/BestSellers"), {
  loading: () => <SectionSkeleton height={360} />,
});
const WhyChooseUs = dynamic(() => import("@/components/home/WhyChooseUs"), {
  loading: () => <SectionSkeleton height={280} />,
});
const BrandStory = dynamic(() => import("@/components/home/BrandStory"), {
  loading: () => <SectionSkeleton height={320} />,
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
  return normalizeHomepageSettings(raw);
}

/**
 * Homefy homepage — kitchen, beauty bags, ladies bags. No car/fitment modules.
 */
export function HomePage({
  initialBestSellers = [],
  initialHotDeals = null,
  initialHeroSlides = null,
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
      <CategoryHighlights />
      <LookbookStrip />
      {sectionEnabled("bestSellers") && homepageSettings.sections?.showBestSellers !== false ? (
        <BestSellers initialProducts={initialBestSellers} settings={homepageSettings} />
      ) : null}
      {sectionEnabled("hotDeals") && homepageSettings.sections?.showHotDeals !== false ? (
        <HotDeals settings={homepageSettings} initialProducts={initialHotDeals} />
      ) : null}
      {sectionEnabled("whyChooseUs") && homepageSettings.sections?.showWhyChooseUs !== false ? (
        <WhyChooseUs settings={homepageSettings} />
      ) : null}
      <BrandStory story={brandStory} activeProductCount={activeProductCount} />
      <NewsletterSignup />
    </div>
  );
}
