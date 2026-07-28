// Short in-memory client cache for public settings (shared across components).

const TTL_MS = 60_000;
let memory = null;
let memoryAt = 0;
let inflight = null;

export async function getPublicSettings() {
  if (typeof window === "undefined") return {};

  if (memory && Date.now() - memoryAt < TTL_MS) {
    return memory;
  }
  if (inflight) return inflight;

  inflight = fetch("/api/settings")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const settings = data?.data || data?.settings || {};
      memory = settings && typeof settings === "object" ? settings : {};
      memoryAt = Date.now();
      return memory;
    })
    .catch(() => {
      memory = null;
      memoryAt = 0;
      return {};
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Clears legacy localStorage keys from older storefront builds + memory cache. */
export function clearSettingsCache() {
  memory = null;
  memoryAt = 0;
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
