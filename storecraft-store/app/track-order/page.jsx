import { Suspense } from "react";
import OrderTrackingView from "@/components/store/OrderTrackingView";

export const metadata = {
  title: "Track Your Order | Crazzycars.pk",
  description: "Track your Postex shipment with your tracking number.",
};

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center", color: "#6B7280" }}>Loading…</div>
      }
    >
      <OrderTrackingView />
    </Suspense>
  );
}
