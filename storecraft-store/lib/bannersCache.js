"use client";

const CACHE_KEY = "store_banners_cache";
const CACHE_TTL = 5 * 60 * 1000;

let memoryCache = null;
let memoryCacheTime = 0;
let fetchPromise = null;

export async function getBanners() {
  if (typeof window === "undefined") return null;

  if (memoryCache && Date.now() - memoryCacheTime < CACHE_TTL) return memoryCache;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL) {
        memoryCache = data;
        memoryCacheTime = Date.now();
        return data;
      }
    }
  } catch {}

  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/banners")
    .then((r) => r.json())
    .then((data) => {
      memoryCache = data;
      memoryCacheTime = Date.now();
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      } catch {}
      fetchPromise = null;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return null;
    });

  return fetchPromise;
}
