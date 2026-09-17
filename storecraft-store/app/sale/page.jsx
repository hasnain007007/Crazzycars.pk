import { Suspense } from "react";
import SalePageView from "@/components/store/SalePageView";
import { SalePageChrome } from "@/components/store/SalePageChrome";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { fetchSaleProductsServer } from "@/lib/serverSaleProducts";
import {
  resolveSaleTabId,
  SALE_DEFAULT_TAB,
  SALE_SSR_LIMIT,
} from "@/lib/saleTabs";
import { collectionPageJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getSiteUrl } from "@/lib/siteUrl";

/** Refresh deal grid periodically so SSR HTML stays current. */
export const revalidate = 120;

export const metadata = buildPageMetadata({
  title: `Hot Deals & Sale — ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`,
  description:
    "Shop live sale deals on car accessories in Pakistan — LED lights, spoilers, carbon fiber trims, body kits and more. Cash on Delivery nationwide from CrazzyCars.pk.",
  path: "/sale",
  absoluteTitle: true,
});

export default async function SalePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialTab = resolveSaleTabId(sp.filter) || SALE_DEFAULT_TAB;
  const initialProducts = await fetchSaleProductsServer({
    tabId: initialTab,
    limit: SALE_SSR_LIMIT,
  });
  const site = getSiteUrl();
  const collectionLd = collectionPageJsonLd({
    name: "Sale — Hot Deals on Car Accessories",
    description:
      "Discounted car accessories currently on sale at CrazzyCars.pk, with Cash on Delivery across Pakistan.",
    url: `${site}/sale`,
    products: initialProducts,
    numberOfItems: initialProducts.length,
    breadcrumb: breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Sale", url: "/sale" },
    ]),
  });

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }}
      />
      <SalePageChrome productCount={initialProducts.length} />
      <Suspense fallback={<div className="min-h-[40vh] bg-white" />}>
        <SalePageView initialTab={initialTab} initialProducts={initialProducts} />
      </Suspense>
    </div>
  );
}
