import { Suspense } from "react";
import CheckoutSuccessView from "@/components/store/CheckoutSuccessView";

import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order success",
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #E5E5E5",
            borderTop: "3px solid #111111",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 14, color: "#888888", margin: 0 }}>Loading your order...</p>
      </div>
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
