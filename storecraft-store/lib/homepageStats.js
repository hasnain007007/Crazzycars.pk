/**
 * Homepage / brand-story stats helpers.
 * Product counts are resolved from live DB so CMS placeholders stay accurate.
 */

export function formatActiveProductStat(count) {
  // Number(null) === 0 — treat missing counts as "unknown", not zero products.
  if (count == null || count === "") return null;
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.floor(n);
  return `${rounded.toLocaleString("en-US")}+`;
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
      if (liveProducts && /product/i.test(label)) {
        return { value: liveProducts, label };
      }
      return { value, label };
    })
    .filter(Boolean);
}
