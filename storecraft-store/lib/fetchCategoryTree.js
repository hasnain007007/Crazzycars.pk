/**
 * Browser-side category tree fetch with in-flight dedupe + short memory cache.
 * All header / mega-menu / footer / homepage callers share one network request.
 * Prefer SSR seed via seedCategoryTree() so layout data skips a client round-trip.
 */

const TTL_MS = 60_000;

let memory = null;
let memoryAt = 0;
let inflight = null;

/** Seed from SSR props so ShopByCar-style dual callers / header+footer share one payload. */
export function seedCategoryTree(tree) {
  if (Array.isArray(tree)) {
    memory = tree;
    memoryAt = Date.now();
  }
}

export function fetchCategoryTree() {
  if (typeof window === "undefined") {
    return Promise.resolve(Array.isArray(memory) ? memory : []);
  }

  if (memory && Date.now() - memoryAt < TTL_MS) {
    return Promise.resolve(memory);
  }

  if (inflight) return inflight;

  inflight = fetch("/api/categories/tree")
    .then((r) => r.json())
    .then((data) => {
      const list = data?.categories || data?.data || [];
      const tree = Array.isArray(list) ? list : [];
      memory = tree;
      memoryAt = Date.now();
      return tree;
    })
    .catch(() => {
      memory = null;
      memoryAt = 0;
      return [];
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
