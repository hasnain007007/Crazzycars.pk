import { HomePage } from "@/components/store/HomePage";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { fetchBestSellersServer } from "@/lib/serverBestSellers";
import { fetchCarCatalogServer } from "@/lib/serverCarCatalog";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getHeroSlides } from "@/lib/heroBanners";
import { getBestSellingProducts, getHotDealProducts, isShopifyEnabled } from "@/lib/shopify";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";

export const revalidate = 60;

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

  // Never let a single Mongo/Shopify failure 500 the document — degrade to empty SSR props
  // (client components can still fall back to their own fetches if needed).
  try {
    [bestSellers, hotDeals, heroSlides, carCatalog, activeProductCount] = await Promise.all([
      shopify ? getBestSellingProducts(100) : fetchBestSellersServer({ limit: 100 }),
      shopify ? getHotDealProducts(24) : fetchHotDealsServer({ filter: "all", limit: 24 }),
      getHeroSlides(),
      fetchCarCatalogServer(),
      (async () => {
        try {
          await dbConnect();
          return await Product.countDocuments({ status: { $regex: /^active$/i } });
        } catch {
          return null;
        }
      })(),
    ]);
  } catch (err) {
    console.error("[homepage] SSR data load failed:", err?.message || err);
  }

  const preloadUrl = heroSlides[0]?.imageUrl || "";

  return (
    <>
      {preloadUrl ? (
        // eslint-disable-next-line @next/next/no-head-element -- preload LCP hero into document head via React hoist
        <link rel="preload" as="image" href={preloadUrl} fetchPriority="high" />
      ) : null}
      <HomePage
        initialBestSellers={bestSellers}
        initialHotDeals={hotDeals}
        initialHeroSlides={heroSlides}
        initialCarCatalog={carCatalog}
        activeProductCount={activeProductCount}
      />
    </>
  );
}
