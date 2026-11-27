import { Suspense } from "react";
import CheckoutSuccessView from "@/components/store/CheckoutSuccessView";
import { CarLoader } from "@/components/store/EmptyArt";

import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order success",
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

function LoadingFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
      <CarLoader label="Loading your order…" />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        minHeight: "100vh",
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <CheckoutSuccessView />
      </Suspense>
    </div>
  );
}
