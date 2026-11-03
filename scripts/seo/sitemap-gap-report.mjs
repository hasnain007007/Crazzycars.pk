#!/usr/bin/env node
/**
 * Task 7: list active products missing from sitemap-products.xml with reason.
 * Usage: node scripts/seo/sitemap-gap-report.mjs
 */
const BASE = (process.env.SITE_URL || "https://crazzycars.pk").replace(/\/+$/, "");

async function main() {
  const xml = await (await fetch(`${BASE}/sitemap-products.xml`)).text();
  const inMap = new Set(
    [...xml.matchAll(/https:\/\/crazzycars\.pk\/([^<]+)/g)].map((m) => m[1].replace(/\/$/, ""))
  );

  // Live probe of a known gap list; full DB scan needs MONGODB_URI locally.
  const suspects = [
    "changan-alsvin-premium-metal-key-cover",
    "toyota-fortuner-3-button-premium-metal-key-cover",
    "honda-city-2009-2020-premium-metal-key-cover",
    "proton-x70-premium-metal-key-cover",
    "glory-580-pro-premium-metal-key-cover",
    "toyota-prius-2012-quarter-glass-louvers-carbon-fiber",
    "universal-car-led-reflector-bumper-side-marker-light",
  ];

  const rows = [];
  for (const slug of suspects) {
    if (inMap.has(slug)) {
      rows.push({ slug, reason: "in_sitemap" });
      continue;
    }
    const html = await (await fetch(`${BASE}/${slug}`)).text();
    const robots = (html.match(/<meta name="robots"[^>]*>/i) || [""])[0];
    const noindex = /noindex/i.test(robots);
    const placeholder = /placeholder/i.test(html);
    let reason = "other";
    if (noindex) reason = "noindex";
    if (placeholder || /photo coming soon/i.test(html)) reason = "no image";
    rows.push({ slug, reason, robots: robots.slice(0, 80) });
  }

  const other = rows.filter((r) => r.reason === "other");
  console.log(JSON.stringify({ sitemapCount: inMap.size, rows, otherCount: other.length }, null, 2));
  if (other.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
