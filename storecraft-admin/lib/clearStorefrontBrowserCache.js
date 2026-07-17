/**
 * Clears legacy storefront settings keys in the browser (admin panel).
 * Call after any successful settings save so a separate storefront tab is not stuck on old cached values.
 */
export function clearStorefrontBrowserCache() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [
      "store_settings",
      "store_public_settings",
      "sialkot_settings",
      "sialkot_store_settings",
      "store_cache",
      "settings_cache",
      "sialkot_homepage_cache",
      "about_page_cache",
      "contact_page_cache",
    ];
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
