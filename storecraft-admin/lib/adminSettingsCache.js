/**
 * Fetches /api/settings for admin chrome (Sidebar, Topbar).
 * In-memory dedupe only — no localStorage (avoids stale logo/name after saves).
 */
const TTL_MS = 30 * 1000;

let memory = null;
let memoryTs = 0;
let inflight = null;

export async function getAdminSettings() {
  if (typeof window === "undefined") return null;

  if (memory && Date.now() - memoryTs < TTL_MS) {
    return memory;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`/api/settings?_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      const json = await res.json();
      if (!json.success) return memory;
      const data = json.settings || json.data || {};
      const rawName = data.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
      const storeName = /homefy/i.test(String(rawName)) ? "Crazzycars.pk" : rawName;
      const next = {
        storeName,
        logoUrl:
          (typeof data.general?.logoUrl === "string" && data.general.logoUrl) ||
          (typeof data.general?.logo === "string" && data.general.logo) ||
          data.general?.logo?.url ||
          "",
      };
      memory = next;
      memoryTs = Date.now();
      return next;
    } catch {
      return memory;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearAdminSettingsCache() {
  memory = null;
  memoryTs = 0;
  inflight = null;
}
