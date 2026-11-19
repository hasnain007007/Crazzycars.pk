import nextDynamic from "next/dynamic";
import BrandHero from "@/components/home/BrandHero";
import StatsBar from "@/components/home/StatsBar";
import GoogleReviewsNote from "@/components/home/GoogleReviewsNote";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

/**
 * Homepage shell is a Server Component so StatsBar / BrandHero / WhyChooseUs /
 * GoogleReviewsNote do not hydrate. Interactive below-fold sections stay client
 * via next/dynamic with ssr:true (HTML stays in the document).
 */
const ShopByCar = nextDynamic(() => import("@/components/home/ShopByCar"), {
  ssr: true,
  loading: () => <SectionSkeleton height={220} />,
});
const ShopByVehicle = nextDynamic(() => import("@/components/home/ShopByVehicle"), {
  ssr: true,
  loading: () => <SectionSkeleton height={280} />,
});
const CategoryGrid = nextDynamic(() => import("@/components/home/CategoryGrid"), {
  ssr: true,
  loading: () => <SectionSkeleton height={200} />,
});
const HotDeals = nextDynamic(() => import("@/components/home/HotDeals"), {
  ssr: true,
  loading: () => <SectionSkeleton height={360} />,
});
const CategoryShowcaseRails = nextDynamic(() => import("@/components/home/CategoryShowcaseRails"), {
  ssr: true,
  loading: () => <SectionSkeleton height={420} />,
});
const BestSellers = nextDynamic(() => import("@/components/home/BestSellers"), {
  ssr: true,
  loading: () => <SectionSkeleton height={360} />,
});
const ReviewsCarousel = nextDynamic(() => import("@/components/home/ReviewsCarousel"), {
  ssr: true,
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
  if (!raw || typeof raw !== "object") return DEFAULT_HOMEPAGE_SETTINGS;
  return {
    ...DEFAULT_HOMEPAGE_SETTINGS,
    ...raw,
    sections: { ...DEFAULT_HOMEPAGE_SETTINGS.sections, ...(raw.sections || {}) },
  };
}

/**
 * Homepage — above-the-fold BrandHero + StatsBar stay server-rendered.
 * Deals / best sellers / car shoppers stay code-split client islands.
 */
export function HomePage({
  intro = null,
  initialBestSellers = [],
  initialHotDeals = null,
  initialHeroSlides = null,
  initialCarCatalog = null,
  initialCategories = null,
  activeProductCount = null,
  homepageSettings: homepageSettingsProp = null,
  brandStory: brandStoryProp = null,
  prepaidPercent = null,
}) {
  const homepageSettings = mergeHomepageSettings(homepageSettingsProp);
  const brandStory = brandStoryProp || null;

  const sectionOrder =
    Array.isArray(homepageSettings.sectionOrder) && homepageSettings.sectionOrder.length
      ? [...homepageSettings.sectionOrder].sort((a, b) => (a.order || 0) - (b.order || 0))
      : DEFAULT_HOMEPAGE_SETTINGS.sectionOrder;
  const sectionEnabled = (id) => sectionOrder.find((s) => s.id === id)?.enabled !== false;

  return (
    <div style={{ background: "var(--color-background)" }}>
      {sectionEnabled("hero") ? <BrandHero prepaidPercent={prepaidPercent} /> : null}
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
      {/* Tree comes from header seed / client fetch — avoid a second full-tree RSC embed. */}
      <CategoryShowcaseRails />
      {sectionEnabled("hotDeals") && homepageSettings.sections?.showHotDeals !== false ? (
        <HotDeals settings={homepageSettings} initialProducts={initialHotDeals} />
      ) : null}
      {sectionEnabled("bestSellers") && homepageSettings.sections?.showBestSellers !== false ? (
        <BestSellers initialProducts={initialBestSellers} settings={homepageSettings} />
      ) : null}
      {sectionEnabled("reviews") && homepageSettings.sections?.showReviews !== false ? (
        <ReviewsCarousel />
      ) : null}
      <GoogleReviewsNote />
      {sectionEnabled("whyChooseUs") && homepageSettings.sections?.showWhyChooseUs !== false ? (
        <WhyChooseUs
          story={brandStory}
          heroImage={
            Array.isArray(initialHeroSlides) && initialHeroSlides[0]?.imageUrl
              ? initialHeroSlides[0].imageUrl
              : ""
          }
          prepaidPercent={prepaidPercent}
        />
      ) : null}
      {/* Server-rendered "About CrazzyCars.pk" (from app/page.jsx) — last block above the footer. */}
      {intro || null}
    </div>
  );
}
