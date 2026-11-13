import { HomePage } from "@/components/store/HomePage";
import HomeIndexableIntro from "@/components/home/HomeIndexableIntro";
import { getPublicStoreSettings } from "@/lib/serverSettings";
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

/** First paint: one desktop grid row (5) + a few extras — rest via Show more. */
const HOME_GRID_LIMIT = 10;

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
  // Same per-request cached settings read as the layout.
  const homeIntro = await getPublicStoreSettings()
    .then((st) => st?.homepageSettings?.homeIntro || "")
    .catch(() => "");
  let bestSellers = [];
  let hotDeals = [];
  let heroSlides = [];
  let carCatalog = null;
  let activeProductCount = null;
  let homepageCategories = [];

  // Never let a single Mongo/Shopify failure 500 the document — degrade to empty SSR props
  // (client components can still fall back to their own fetches if needed).
  try {
    // Best sellers skip anything already in Hot Deals, so the two rows show different products.
    // Category tree stays in layout (header) only — do not re-embed it in homepage RSC props.
    const dealsThenBest = shopify
      ? Promise.all([getHotDealProducts(HOME_GRID_LIMIT), getBestSellingProducts(HOME_GRID_LIMIT)])
      : fetchHotDealsServer({ filter: "all", limit: HOME_GRID_LIMIT }).then(async (deals) => [
          deals,
          await fetchBestSellersServer({
            limit: HOME_GRID_LIMIT,
            excludeIds: (deals || []).map((d) => d.id || d._id).filter(Boolean),
          }),
        ]);
    let pair;
    let tree = [];
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
    homepageCategories = pickHomepageCategories(Array.isArray(tree) ? tree : [])
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
        intro={<HomeIndexableIntro text={homeIntro} />}
        initialBestSellers={bestSellers}
        initialHotDeals={hotDeals}
        initialHeroSlides={heroSlides}
        initialCarCatalog={carCatalog}
        initialCategories={homepageCategories}
        activeProductCount={activeProductCount}
      />
    </>
  );
}
