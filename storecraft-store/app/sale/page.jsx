import { Suspense } from "react";
import SalePageView from "@/components/store/SalePageView";

export const metadata = {
  title: `Hot Deals & Sale — ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
  description:
    "Up to 50% off premium car accessories — seat covers, steering wheels, ear accessories and more.",
};

export default function SalePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SalePageView />
    </Suspense>
  );
}
