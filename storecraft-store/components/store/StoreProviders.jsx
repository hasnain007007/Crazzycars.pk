"use client";

import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { StoreSettingsProvider } from "@/context/StoreSettingsContext";
import { setStoreCurrency } from "@/lib/currency";

export function StoreProviders({ children, settings }) {
  useEffect(() => {
    const code = settings?.general?.currency || settings?.currency || "PKR";
    setStoreCurrency(code);
  }, [settings]);

  return (
    <StoreSettingsProvider settings={settings}>
      <CartProvider>{children}</CartProvider>
    </StoreSettingsProvider>
  );
}
