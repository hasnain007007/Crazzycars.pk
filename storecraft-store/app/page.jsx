import { HomePage } from "@/components/store/HomePage";
import HomeIndexableIntro from "@/components/home/HomeIndexableIntro";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { fetchBestSellersServer } from "@/lib/serverBestSellers";
import { fetchCarCatalogServer } from "@/lib/serverCarCatalog";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getHeroSlides } from "@/lib/heroBanners";
import { getBestSellingProducts, getHotDealProducts, isShopifyEnabled } from "@/lib/shopify";
import { dbConnect } from "@/lib/db";
import { fetchCategoryTreeServer } from "@/lib/serverCategoryTree";
import { pickHomepageCategories, serializeHomepageCategory } from "@/lib/homepageCategories";
import Product from "@/lib/models/Product.model";
import { categoryHref } from "@/lib/categories";
import { homeHubCollectionJsonLd } from "@/lib/seo/jsonld";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getPageSeoOverride } from "@/lib/seo/gscAudit2026-10.mjs";

export const revalidate = 600;

const homeSeo = getPageSeoOverride("/") || {};
const HOME_TITLE = homeSeo.title || "Car Accessories in Pakistan | Kits, LEDs & Mats";
export const metadata = buildPageMetadata({
  // absoluteTitle: do not append brand again (override already branded / ≤60).
  title: HOME_TITLE,
  description:
    homeSeo.meta ||
    "Buy car accessories online in Pakistan: splitters, body kits, LED lights, carbon fiber and interior accessories. COD on eligible items, nationwide delivery.",
  path: "/",
  absoluteTitle: true,
});

export default async function Page() {
  const shopify = isShopifyEnabled();
  let bestSellers = [];
  let hotDeals = [];
  let heroSlides = [];
  let carCatalog = null;
  let activeProductCount = null;
  let homepageCategories = [];
  let categoryTree = [];

  // Never let a single Mongo/Shopify failure 500 the document — degrade to empty SSR props
  // (client components can still fall back to their own fetches if needed).
  try {
    let tree = [];
    // Best sellers skip anything already in Hot Deals, so the two rows show different products.
    const dealsThenBest = shopify
      ? Promise.all([getHotDealProducts(24), getBestSellingProducts(24)])
      : fetchHotDealsServer({ filter: "all", limit: 24 }).then(async (deals) => [
          deals,
          await fetchBestSellersServer({
            limit: 24,
            excludeIds: (deals || []).map((d) => d.id || d._id).filter(Boolean),
          }),
        ]);
    let pair;
    [pair, heroSlides, carCatalog, activeProductCount, tree] = await Promise.all([
      dealsThenBest,
      getHeroSlides(),
      fetchCarCatalogServer({ lean: true }),
      (async () => {
        try {
          await dbConnect();
          return await Product.countDocuments({ status: { $regex: /^active$/i } });
        } catch {
          return null;
        }
      })(),
      fetchCategoryTreeServer(),
    ]);
    [hotDeals, bestSellers] = pair;
    categoryTree = Array.isArray(tree) ? tree : [];
    homepageCategories = pickHomepageCategories(categoryTree)
      .map(serializeHomepageCategory)
      .filter(Boolean);
  } catch (err) {
    console.error("[homepage] SSR data load failed:", err?.message || err);
  }


  const hubItems = [
    { name: "Shop all car accessories", url: "/shop" },
    { name: "Shop by car", url: "/cars" },
    { name: "Browse categories", url: "/categories" },
    { name: "Cash on Delivery", url: "/cash-on-delivery" },
    { name: "Hot deals", url: "/sale" },
    { name: "FAQ", url: "/faq" },
    ...homepageCategories.slice(0, 10).map((c) => ({
      name: c.name,
      url: categoryHref(c.slug),
    })),
    ...(Array.isArray(carCatalog?.popular) ? carCatalog.popular : [])
      .filter((v) => v?.slug)
      .slice(0, 12)
      .map((v) => ({
        name: `${v.make || ""} ${v.model || ""}`.trim() || v.slug,
        url: `/cars/${v.slug}`,
      })),
  ];
  const homeLd = homeHubCollectionJsonLd({
    description:
      "Buy car accessories online in Pakistan — splitters, body kits, LED lights, carbon fiber accessories & more. COD on eligible items.",
    items: hubItems,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(homeLd) }}
      />
      {/* Preload the BrandHero car (LCP) — same files as components/home/BrandHero.jsx. */}
      <link rel="preload" as="image" href="/hero/civic-night-760.webp" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/hero/civic-night-1205.webp" media="(min-width: 768px)" fetchPriority="high" />
      <HomePage
        initialBestSellers={bestSellers}
        initialHotDeals={hotDeals}
        initialHeroSlides={heroSlides}
        initialCarCatalog={carCatalog}
        initialCategories={homepageCategories}
        initialCategoryTree={categoryTree}
        activeProductCount={activeProductCount}
      />
      <HomeIndexableIntro />
    </>
  );
}
