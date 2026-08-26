import { Suspense } from "react";
import OrderTrackingView from "@/components/store/OrderTrackingView";
import { OrderTrackingChrome } from "@/components/store/OrderTrackingChrome";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: "Track Your Order | Homefy.pk",
  description: "Track your Postex shipment with your tracking number.",
  path: "/track-order",
  absoluteTitle: true,
  noIndex: true,
});

export default function TrackOrderPage() {
  return (
    <div className="cc-track cc-track--compact">
      <div className="cc-track__shell">
        <OrderTrackingChrome />
        <Suspense fallback={<p className="cc-track__hint">Loading…</p>}>
          <OrderTrackingView />
        </Suspense>
      </div>
    </div>
  );
}
