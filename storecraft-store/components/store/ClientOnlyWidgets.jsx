"use client";

import { useEffect, useState } from "react";

/**
 * SSR null, then mount interaction-only widgets.
 * Dynamic-import after mount so CartDrawer / WhatsApp stay out of the first JS graph.
 * Avoid next/dynamic `{ ssr: false }`, which emits BAILOUT_TO_CLIENT_SIDE_RENDERING.
 */
function AfterMount({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return children;
}

function LazyCartAndWhatsApp() {
  const [nodes, setNodes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@/components/store/CartDrawer"),
      import("@/components/store/WhatsAppButton"),
    ]).then(([cartMod, waMod]) => {
      if (cancelled) return;
      const CartDrawer = cartMod.CartDrawer;
      const WhatsAppButton = waMod.default;
      setNodes(
        <>
          <CartDrawer />
          <WhatsAppButton />
        </>
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return nodes;
}

function LazyLivePresence() {
  const [Beacon, setBeacon] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import("@/components/store/LivePresenceBeacon").then((mod) => {
      if (!cancelled) setBeacon(() => mod.LivePresenceBeacon);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Beacon) return null;
  return <Beacon />;
}

export function LivePresenceClient() {
  return (
    <AfterMount>
      <LazyLivePresence />
    </AfterMount>
  );
}

export function ClientOnlyWidgets() {
  return (
    <AfterMount>
      <LazyCartAndWhatsApp />
    </AfterMount>
  );
}
