import { HomePage } from "@/components/store/HomePage";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { fetchBestSellersServer } from "@/lib/serverBestSellers";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getHeroSlides } from "@/lib/heroBanners";
import { getBestSellingProducts, getHotDealProducts, isShopifyEnabled } from "@/lib/shopify";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgCountActiveProducts } from "@/lib/pg/catalog";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Homefy.pk | Kitchen Accessories, Beauty & Travel Bags, Ladies Bags",
  description:
    "Shop kitchen accessories, beauty & travel bags (makeup pouches, toiletry kits) and ladies handbags online in Pakistan. Cash on Delivery nationwide.",
  path: "/",
});

export default async function Page() {
  const shopify = isShopifyEnabled();
  let bestSellers = [];
  let hotDeals = [];
  let heroSlides = [];
  let activeProductCount = null;

  try {
    [bestSellers, hotDeals, heroSlides, activeProductCount] = await Promise.all([
      shopify ? getBestSellingProducts(100) : fetchBestSellersServer({ limit: 100 }),
      shopify ? getHotDealProducts(24) : fetchHotDealsServer({ filter: "all", limit: 24 }),
      getHeroSlides(),
      (async () => {
        try {
          if (isPostgresCatalog()) return await pgCountActiveProducts();
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

  const preloadUrl = heroSlides[0]?.imageUrl || "/images/placeholder-hero.svg";

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
        activeProductCount={activeProductCount}
      />
    </>
  );
}
