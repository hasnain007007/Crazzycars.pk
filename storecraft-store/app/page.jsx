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
      shopify ? getBestSellingProducts(12) : fetchBestSellersServer({ limit: 12 }),
      shopify ? getHotDealProducts(8) : fetchHotDealsServer({ filter: "all", limit: 8 }),
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
    ]);
  } catch (err) {
    console.error("[homepage] SSR data load failed:", err?.message || err);
  }

  const desktopPreload = heroSlides[0]?.imageUrl || "";
  const mobilePreload = heroSlides[0]?.imageUrlMobile || desktopPreload;

  return (
    <>
      {mobilePreload ? (
        // eslint-disable-next-line @next/next/no-head-element -- preload LCP hero into document head via React hoist
        <link
          rel="preload"
          as="image"
          href={mobilePreload}
          media="(max-width: 768px)"
          fetchPriority="high"
        />
      ) : null}
      {desktopPreload ? (
        // eslint-disable-next-line @next/next/no-head-element -- preload matching desktop hero
        <link
          rel="preload"
          as="image"
          href={desktopPreload}
          media="(min-width: 769px)"
          fetchPriority="high"
        />
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
