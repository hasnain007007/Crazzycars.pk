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

/** Refresh deal grid periodically so SSR HTML stays current. */
export const revalidate = 120;

export const metadata = buildPageMetadata({
  title: `Hot Deals & Sale — ${process.env.NEXT_PUBLIC_STORE_NAME || "Homefy.pk"}`,
  description:
    "Sale on kitchen accessories, beauty & travel bags and ladies bags from Homefy.pk. Cash on Delivery nationwide.",
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

  return (
    <div className="min-h-screen bg-white">
      <SalePageChrome />
      <Suspense fallback={<div className="min-h-[40vh] bg-white" />}>
        <SalePageView initialTab={initialTab} initialProducts={initialProducts} />
      </Suspense>
    </div>
  );
}
