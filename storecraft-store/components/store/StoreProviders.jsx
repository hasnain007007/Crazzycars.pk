"use client";

import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { StoreSettingsProvider } from "@/context/StoreSettingsContext";
import { setStoreCurrency } from "@/lib/currency";
import { clearSettingsCache } from "@/lib/settingsCache";

export function StoreProviders({ children, settings, shopifyEnabled = false }) {
  useEffect(() => {
    const code = settings?.general?.currency || settings?.currency || "PKR";
    setStoreCurrency(code);
    clearSettingsCache();
    try {
      localStorage.removeItem("store_banners_cache");
      localStorage.removeItem("sialkot_homepage_cache");
    } catch {
      /* ignore */
    }
  }, [settings]);

  return (
    <StoreSettingsProvider settings={settings}>
      <CartProvider shopifyEnabled={shopifyEnabled}>{children}</CartProvider>
    </StoreSettingsProvider>
  );
}
