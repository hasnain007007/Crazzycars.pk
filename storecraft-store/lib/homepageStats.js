/**
 * Homepage / brand-story stats helpers.
 * Product counts are resolved from live DB so CMS placeholders stay accurate.
 * Unverifiable hype stats (happy customers, premier, round-number marketing) are dropped.
 */

export function formatActiveProductStat(count) {
  // Number(null) === 0 — treat missing counts as "unknown", not zero products.
  if (count == null || count === "") return null;
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.floor(n);
  return `${rounded.toLocaleString("en-US")}+`;
}

/** Drop CMS marketing claims that cannot be verified from store data. */
export function isUnverifiableStat(value, label) {
  const v = String(value || "").trim();
  const l = String(label || "").trim().toLowerCase();
  if (/happy\s+customers?|satisfied\s+customers?|customers?\s+served/i.test(l)) return true;
  if (/premier|no\.?\s*1|number\s*one|#1/i.test(l) || /premier|no\.?\s*1|#1/i.test(v)) return true;
  if (/trusted\s+by|thousands|million/i.test(l) || /trusted\s+by|10,?000\+|20,?000\+/i.test(v)) return true;
  return false;
}

/**
 * @param {Array<{ value?: string, number?: string, label?: string }>} stats
 * @param {{ activeProductCount?: number|null }} opts
 */
export function resolveHomepageStats(stats, opts = {}) {
  const list = Array.isArray(stats) ? stats : [];
  const liveProducts = formatActiveProductStat(opts.activeProductCount);
  return list
    .map((s) => {
      const value = String(s?.value || s?.number || "").trim();
      const label = String(s?.label || "").trim();
      if (!value && !label) return null;
      if (isUnverifiableStat(value, label)) return null;
      // Seed mock "66+ Active products" — never show once the catalog is cleared.
      if (/^66\+?$/i.test(value) && /product/i.test(label)) return null;
      if (liveProducts && /product/i.test(label)) {
        return { value: liveProducts, label };
      }
      // Hide product-count rows until real SKUs exist (avoid "0+").
      if (/product/i.test(label) && !liveProducts) return null;
      return { value, label };
    })
    .filter(Boolean);
}
