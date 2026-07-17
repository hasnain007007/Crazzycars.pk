// No localStorage caching — always fetch fresh settings from the API.

export async function getPublicSettings() {
  if (typeof window === "undefined") return {};
  try {
    const res = await fetch(`/api/settings?_=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data?.data || data?.settings || {};
  } catch {
    return {};
  }
}

/** Clears legacy localStorage keys from older storefront builds. */
export function clearSettingsCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("store_settings");
    localStorage.removeItem("store_public_settings");
    localStorage.removeItem("sialkot_settings");
    localStorage.removeItem("sialkot_store_settings");
  } catch {
    /* ignore */
  }
}

/** @deprecated use clearSettingsCache */
export function invalidateSettingsCache() {
  clearSettingsCache();
}
