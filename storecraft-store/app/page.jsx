import { HomePage } from "@/components/store/HomePage";
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

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "CrazzyCars.pk | Car Accessories Pakistan",
  description:
    "Buy premium car accessories online in Pakistan — splitters, body kits, LED lights, carbon fiber accessories & more. Cash on Delivery nationwide. CrazzyCars.pk",
  path: "/",
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
    [bestSellers, hotDeals, heroSlides, carCatalog, activeProductCount, tree] = await Promise.all([
      shopify ? getBestSellingProducts(24) : fetchBestSellersServer({ limit: 24 }),
      shopify ? getHotDealProducts(24) : fetchHotDealsServer({ filter: "all", limit: 24 }),
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
    categoryTree = Array.isArray(tree) ? tree : [];
    homepageCategories = pickHomepageCategories(categoryTree)
      .map(serializeHomepageCategory)
      .filter(Boolean);
  } catch (err) {
    console.error("[homepage] SSR data load failed:", err?.message || err);
  }

  const desktopPreload = heroSlides[0]?.imageUrl || "";

  return (
    <>
      {desktopPreload ? (
        // eslint-disable-next-line @next/next/no-head-element -- preload LCP hero
        <link rel="preload" as="image" href={desktopPreload} fetchPriority="high" />
      ) : null}
      <HomePage
        initialBestSellers={bestSellers}
        initialHotDeals={hotDeals}
        initialHeroSlides={heroSlides}
        initialCarCatalog={carCatalog}
        initialCategories={homepageCategories}
        initialCategoryTree={categoryTree}
        activeProductCount={activeProductCount}
      />
    </>
  );
}
