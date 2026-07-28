import { HomePage } from "@/components/store/HomePage";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { fetchCarCatalogServer } from "@/lib/serverCarCatalog";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getHeroSlides } from "@/lib/heroBanners";
import { getBestSellingProducts, getHotDealProducts, isShopifyEnabled } from "@/lib/shopify";

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

  // Never let a single Mongo/Shopify failure 500 the document — degrade to empty SSR props
  // (client components can still fall back to their own fetches if needed).
  try {
    [bestSellers, hotDeals, heroSlides, carCatalog] = await Promise.all([
      shopify
        ? getBestSellingProducts(8)
        : fetchProductsServer({ limit: 4, sort: "popular" }).then((r) => r.products),
      shopify ? getHotDealProducts(12) : fetchHotDealsServer({ filter: "all", limit: 12 }),
      getHeroSlides(),
      fetchCarCatalogServer(),
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
      />
    </>
  );
}
