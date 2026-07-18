import { HomePage } from "@/components/store/HomePage";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getHeroSlides } from "@/lib/heroBanners";
import { getBestSellingProducts, getHotDealProducts, isShopifyEnabled } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "CrazzyCars.pk | Car Accessories Pakistan",
  description:
    "Buy premium car accessories online in Pakistan — splitters, body kits, LED lights, carbon fiber accessories & more. Cash on Delivery nationwide. CrazzyCars.pk",
  path: "/",
});

export default async function Page() {
  const shopify = isShopifyEnabled();
  const [bestSellers, hotDeals, heroSlides] = await Promise.all([
    shopify
      ? getBestSellingProducts(8)
      : fetchProductsServer({ limit: 4, sort: "popular" }).then((r) => r.products),
    shopify ? getHotDealProducts(12) : Promise.resolve(null),
    getHeroSlides(),
  ]);

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
      />
    </>
  );
}
