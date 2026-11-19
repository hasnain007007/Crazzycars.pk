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
import { homeHubCollectionJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getPageSeoOverride } from "@/lib/seo/gscAudit2026-10.mjs";
import { BRAND_NAME } from "@/lib/brand";
import { STORE_NAP } from "@/config/store-nap";

/** First paint: one desktop grid row (5) + a few extras — rest via Show more. */
const HOME_GRID_LIMIT = 10;

export const revalidate = 600;

/** Brand-first homepage title — Google Images / sitelinks site-name signal. */
const HOME_TITLE_DEFAULT = "CrazzyCars.pk | Car Accessories in Pakistan – Kits, LEDs & Mats";
const homeSeo = getPageSeoOverride("/") || {};
const HOME_TITLE = homeSeo.title || HOME_TITLE_DEFAULT;
export const metadata = buildPageMetadata({
  // absoluteTitle: brand already leading — do not append "| CrazzyCars.pk" again.
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
  const publicSettings = await getPublicStoreSettings().catch(() => null);
  const homeIntro = publicSettings?.homepageSettings?.homeIntro || "";
  const homepageSettings = publicSettings?.homepageSettings || null;
  const brandStory = publicSettings?.brandStory || null;
  const prepaidPercent =
    Number(publicSettings?.storePayment?.advancePaymentDiscountPercent) || null;
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
  const websiteLd = websiteJsonLd({
    name: BRAND_NAME,
    alternateName: ["CrazzyCars", "Crazzy Cars"],
    sameAs: STORE_NAP.sameAs,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(homeLd) }}
      />
      {/*
        Hero image preloads live in app/layout.js <head> (earlier discovery).
        Brand-hero CSS: experimental.inlineCss + sync decode on the LCP img.
        Keep a minimal critical block here as belt-and-suspenders if inlineCss
        fails mid-deploy — styles still apply before the car paints.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            ".brand-hero{position:relative;overflow:hidden;color:#fff;background:#050505}.brand-hero__inner{position:relative;max-width:1280px;margin:0 auto;min-height:480px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:center;padding:36px 24px 0}.brand-hero__copy{position:relative;z-index:2;padding-bottom:64px}.brand-hero__kicker{margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ef4444}.brand-hero__title{margin:0;font-family:var(--font-heading),Rajdhani,sans-serif;font-weight:700;font-size:clamp(44px,6vw,82px);line-height:.98;letter-spacing:-.01em;color:#fff}.brand-hero__title span{color:#e11d2a}.brand-hero__sub{margin:18px 0 0;max-width:34ch;font-size:17px;line-height:1.5;color:rgba(255,255,255,.78)}.brand-hero__offers{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:22px}.brand-hero__coupon{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px dashed rgba(255,255,255,.55);border-radius:8px;font-size:14px;color:rgba(255,255,255,.9)}.brand-hero__coupon strong{color:#fff;font-size:16px}.brand-hero__offer-link{font-size:14px;color:rgba(255,255,255,.8);text-decoration:underline;text-underline-offset:3px}.brand-hero__actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.brand-hero__btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 26px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none}.brand-hero__btn--primary{background:#c41e1e;color:#fff}.brand-hero__btn--ghost{border:1.5px solid rgba(255,255,255,.5);color:#fff}.brand-hero__visual{position:absolute;z-index:1;right:0;bottom:46px;width:min(62%,860px)}.brand-hero__car{display:block;width:100%;height:auto}.brand-hero__road{position:relative;z-index:2;height:46px;background:linear-gradient(#1b1b1b,#111);border-top:2px solid #2a2a2a;overflow:hidden}.brand-hero__lane{position:absolute;left:-80px;right:-80px;top:50%;height:4px;margin-top:-2px;background:repeating-linear-gradient(90deg,#e5b100 0 44px,transparent 44px 80px)}@media(max-width:767px){.brand-hero__inner{display:flex;flex-direction:column;align-items:stretch;text-align:left;min-height:0;padding:20px 16px 0}.brand-hero__copy{display:contents}.brand-hero__kicker{order:1;font-size:11px;margin-bottom:8px}.brand-hero__title{order:2;font-size:clamp(38px,11vw,48px)}.brand-hero__visual{order:3;position:relative;right:auto;bottom:auto;width:auto;margin:0 -16px 10px}.brand-hero__offers{order:4;margin-top:0;gap:8px 12px}.brand-hero__coupon{font-size:12.5px;padding:6px 10px}.brand-hero__coupon strong{font-size:14px}.brand-hero__offer-link{font-size:12.5px}.brand-hero__actions{order:5;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 18px}.brand-hero__btn{min-height:46px;padding:0 10px;font-size:14px}.brand-hero__sub{display:none}.brand-hero__road{height:30px}}",
        }}
      />
      <HomePage
        intro={<HomeIndexableIntro text={homeIntro} />}
        initialBestSellers={bestSellers}
        initialHotDeals={hotDeals}
        initialHeroSlides={heroSlides}
        initialCarCatalog={carCatalog}
        initialCategories={homepageCategories}
        activeProductCount={activeProductCount}
        homepageSettings={homepageSettings}
        brandStory={brandStory}
        prepaidPercent={prepaidPercent}
      />
    </>
  );
}
