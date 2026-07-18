"use client";

import dynamic from "next/dynamic";

const CartDrawer = dynamic(
  () => import("@/components/store/CartDrawer").then((m) => m.CartDrawer),
  { ssr: false }
);
const WhatsAppButton = dynamic(() => import("@/components/store/WhatsAppButton"), { ssr: false });
const LivePresenceBeacon = dynamic(
  () => import("@/components/store/LivePresenceBeacon").then((m) => m.LivePresenceBeacon),
  { ssr: false }
);

/** Client-only — `dynamic(..., { ssr: false })` is not allowed in Server Components. */
export function LivePresenceClient() {
  return <LivePresenceBeacon />;
}

export function ClientOnlyWidgets() {
  return (
    <>
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}
