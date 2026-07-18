import { Suspense } from "react";
import SalePageView from "@/components/store/SalePageView";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: `Hot Deals & Sale — ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`,
  description:
    "Shop sale deals on car accessories — splitters, LED lights, body kits, and more from Crazzycars.pk.",
  path: "/sale",
});

export default function SalePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SalePageView />
    </Suspense>
  );
}
