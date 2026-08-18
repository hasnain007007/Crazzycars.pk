"use client";

import { useEffect, useState } from "react";
import { CartDrawer } from "@/components/store/CartDrawer";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import { LivePresenceBeacon } from "@/components/store/LivePresenceBeacon";

/**
 * SSR null, then mount. Avoid next/dynamic `{ ssr: false }`, which emits
 * BAILOUT_TO_CLIENT_SIDE_RENDERING into the HTML document.
 */
function AfterMount({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return children;
}

export function LivePresenceClient() {
  return (
    <AfterMount>
      <LivePresenceBeacon />
    </AfterMount>
  );
}

export function ClientOnlyWidgets() {
  return (
    <AfterMount>
      <CartDrawer />
      <WhatsAppButton />
    </AfterMount>
  );
}
