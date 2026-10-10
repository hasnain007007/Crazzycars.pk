import { Suspense } from "react";
import OrderTrackingView from "@/components/store/OrderTrackingView";
import { OrderTrackingChrome } from "@/components/store/OrderTrackingChrome";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: "Track Your Order | CrazzyCars",
  description:
    "Track your CrazzyCars order with your PostEx or Run Courier tracking number, or WhatsApp 03284010007 for help. Nationwide delivery from Gujranwala.",
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
