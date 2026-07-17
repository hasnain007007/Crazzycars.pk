"use client";

import { createContext, useContext } from "react";
import { mapProductBadgeSettings } from "@/lib/mapProductBadges";

const StoreSettingsContext = createContext(null);

export function StoreSettingsProvider({ settings, children }) {
  const value = settings && typeof settings === "object" ? settings : {};
  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext) || {};
}

export function useProductBadgeConfig() {
  const settings = useStoreSettings();
  return settings.productBadgeUi || mapProductBadgeSettings(settings.productBadges);
}

export function useCheckoutMessages() {
  const settings = useStoreSettings();
  return settings.checkoutMessages || {};
}

export function useStorePayment() {
  const settings = useStoreSettings();
  return settings.storePayment || {};
}

export function usePakistaniPaymentMethods() {
  const settings = useStoreSettings();
  return settings.pakistaniPaymentMethods || {};
}

export function useAppearance() {
  const settings = useStoreSettings();
  return settings.appearance || {};
}
