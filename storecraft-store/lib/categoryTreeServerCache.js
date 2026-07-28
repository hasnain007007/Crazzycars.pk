/**
 * Per-instance slim category tree cache (Vercel serverless warm instances).
 * Avoids rebuilding the tree on every concurrent homepage request.
 */

const TTL_MS = 60_000;

let cache = { at: 0, payload: null };

export function getCachedCategoryTreePayload() {
  if (cache.payload && Date.now() - cache.at < TTL_MS) {
    return cache.payload;
  }
  return null;
}

export function setCachedCategoryTreePayload(payload) {
  cache = { at: Date.now(), payload };
}

export function clearCategoryTreeServerCache() {
  cache = { at: 0, payload: null };
}
