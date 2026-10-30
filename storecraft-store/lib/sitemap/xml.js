/** @typedef {{ loc: string, lastmod?: Date | string | null, changefreq?: string, priority?: number }} SitemapUrl */

const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';

export function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Safe lastmod: never throw. Empty object `{}`, Invalid Date, null → "".
 * Callers should pass `updatedAt ?? createdAt ?? new Date()` when a lastmod is required.
 */
export function formatLastMod(value) {
  try {
    if (value == null) return "";
    if (typeof value === "object" && !(value instanceof Date) && !(value instanceof String)) {
      // Corrupt BSON Date that became `{}` — treat as missing.
      if (!(value instanceof Date) && Object.keys(value).length === 0) return "";
      if (!(value instanceof Date)) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString();
      }
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  } catch {
    return "";
  }
}

/** Prefer updatedAt, then createdAt, then now — always a valid Date. */
export function safeLastModDate(...candidates) {
  for (const value of candidates) {
    try {
      if (value == null) continue;
      if (typeof value === "object" && !(value instanceof Date)) {
        if (Object.keys(value).length === 0) continue;
      }
      const d = value instanceof Date ? value : new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    } catch {
      /* try next */
    }
  }
  return new Date();
}

/**
 * @param {SitemapUrl[]} entries
 */
export function buildUrlSetXml(entries) {
  const body = entries
    .map((entry) => {
      const parts = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
      const lastmod = formatLastMod(entry.lastmod);
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
      if (entry.priority != null) parts.push(`    <priority>${Number(entry.priority).toFixed(1)}</priority>`);
      parts.push(`  </url>`);
      return parts.join("\n");
    })
    .join("\n");

  return `${XML_DECL}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

/**
 * @param {{ loc: string, lastmod?: Date | string | null }[]} sitemaps
 */
export function buildSitemapIndexXml(sitemaps) {
  const body = sitemaps
    .map((entry) => {
      const parts = [`  <sitemap>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
      const lastmod = formatLastMod(entry.lastmod);
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      parts.push(`  </sitemap>`);
      return parts.join("\n");
    })
    .join("\n");

  return `${XML_DECL}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export function maxLastMod(entries) {
  let max = null;
  for (const entry of entries) {
    if (!entry.lastmod) continue;
    const d = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod);
    if (Number.isNaN(d.getTime())) continue;
    if (!max || d > max) max = d;
  }
  return max;
}

export const MAX_SITEMAP_URLS = 50000;
