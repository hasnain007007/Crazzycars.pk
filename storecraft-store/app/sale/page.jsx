import { Suspense } from "react";
import SalePageView from "@/components/store/SalePageView";
import { SalePageChrome } from "@/components/store/SalePageChrome";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: `Hot Deals & Sale — ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`,
  description:
    "Shop sale deals on car accessories — splitters, LED lights, body kits, and more from Crazzycars.pk.",
  path: "/sale",
  absoluteTitle: true,
});

export default function SalePage() {
  return (
    <div className="min-h-screen bg-white">
      <SalePageChrome />
      <Suspense fallback={<div className="min-h-[40vh] bg-white" />}>
        <SalePageView />
      </Suspense>
    </div>
  );
}
