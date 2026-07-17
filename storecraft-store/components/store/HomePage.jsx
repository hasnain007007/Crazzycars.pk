"use client";

import { useEffect, useState } from "react";
import BestSellers from "@/components/home/BestSellers";
import BrandCarousel from "@/components/home/BrandCarousel";
import BrandStory from "@/components/home/BrandStory";
import CategoryGrid from "@/components/home/CategoryGrid";
import HotDeals from "@/components/home/HotDeals";
import HomeHero from "@/components/home/HomeHero";
import ShopByCar from "@/components/home/ShopByCar";
import ShopByVehicle from "@/components/home/ShopByVehicle";
import StatsBar from "@/components/home/StatsBar";
import TrustBadges from "@/components/home/TrustBadges";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

export function HomePage({ initialBestSellers = [] }) {
  const ctx = useStoreSettings();
  const [homepageSettings, setHomepageSettings] = useState(DEFAULT_HOMEPAGE_SETTINGS);
  const [trustBadges, setTrustBadges] = useState(ctx?.trustBadges || null);
  const [brandStory, setBrandStory] = useState(ctx?.brandStory || null);

  useEffect(() => {
    if (ctx?.homepageSettings) {
      const hp = ctx.homepageSettings;
      setHomepageSettings({
        ...DEFAULT_HOMEPAGE_SETTINGS,
        ...hp,
        sections: { ...DEFAULT_HOMEPAGE_SETTINGS.sections, ...(hp.sections || {}) },
      });
      setTrustBadges(ctx.trustBadges || null);
      setBrandStory(ctx.brandStory || null);
      return;
    }
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const d = data?.data || {};
        const hp = d.homepageSettings;
        if (hp) {
          setHomepageSettings({
            ...DEFAULT_HOMEPAGE_SETTINGS,
            ...hp,
            sections: { ...DEFAULT_HOMEPAGE_SETTINGS.sections, ...(hp.sections || {}) },
          });
        }
        if (d.trustBadges) setTrustBadges(d.trustBadges);
        if (d.brandStory) setBrandStory(d.brandStory);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  const sectionOrder = Array.isArray(homepageSettings.sectionOrder) && homepageSettings.sectionOrder.length
    ? [...homepageSettings.sectionOrder].sort((a, b) => (a.order || 0) - (b.order || 0))
    : DEFAULT_HOMEPAGE_SETTINGS.sectionOrder;
  const sectionEnabled = (id) => sectionOrder.find((s) => s.id === id)?.enabled !== false;

  return (
    <main style={{ background: "var(--color-background)" }}>
      {sectionEnabled("hero") ? <HomeHero settings={homepageSettings} /> : null}
      <StatsBar />
      {sectionEnabled("trust") ? <TrustBadges items={trustBadges?.items} enabled={trustBadges?.enabled} /> : null}
      {sectionEnabled("shopByCar") && homepageSettings.sections?.showShopByCar !== false ? <ShopByCar title={homepageSettings.sectionTitles?.shopByCar} /> : null}
      {sectionEnabled("categories") && homepageSettings.sections?.showCategories !== false ? <CategoryGrid title={homepageSettings.categories?.title || homepageSettings.sectionTitles?.categories} viewAllText={homepageSettings.categories?.viewAllText} /> : null}
      {sectionEnabled("hotDeals") && homepageSettings.sections?.showHotDeals !== false ? <HotDeals settings={homepageSettings} /> : null}
      {sectionEnabled("bestSellers") && homepageSettings.sections?.showBestSellers !== false ? <BestSellers initialProducts={initialBestSellers} settings={homepageSettings} /> : null}
      <ShopByVehicle />
      {sectionEnabled("brands") && homepageSettings.sections?.showBrands !== false ? <BrandCarousel settings={homepageSettings} /> : null}
      {sectionEnabled("whyChooseUs") && homepageSettings.sections?.showWhyChooseUs !== false ? <WhyChooseUs settings={homepageSettings} /> : null}
      <BrandStory story={brandStory} />
    </main>
  );
}

export default HomePage;
