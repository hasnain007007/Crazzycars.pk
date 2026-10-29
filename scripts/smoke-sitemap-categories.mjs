#!/usr/bin/env node
/**
 * Smoke: every URL in /sitemap-categories.xml must return HTTP 200.
 *
 *   BASE_URL=https://crazzycars.pk node scripts/smoke-sitemap-categories.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-sitemap-categories.mjs
 *
 * Exit 1 if any URL is non-200. Prints product-count hints when --counts
 * (parses visible "N products" / JSON-LD when present).
 */
const BASE = (process.env.BASE_URL || "https://crazzycars.pk").replace(/\/$/, "");
const WANT_COUNTS = process.argv.includes("--counts");

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsCategorySmoke/1.0" },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, text };
}

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function productCountHint(html) {
  const m =
    html.match(/(\d+)\s+products?/i) ||
    html.match(/"numberOfItems"\s*:\s*(\d+)/i) ||
    html.match(/Showing\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

async function main() {
  const smUrl = `${BASE}/sitemap-categories.xml`;
  const sm = await fetchText(smUrl);
  if (sm.status !== 200) {
    console.error(`FAIL sitemap ${smUrl} → ${sm.status}`);
    process.exit(1);
  }
  const urls = parseLocs(sm.text).filter((u) => /\/categories\//.test(u));
  console.log(`Checking ${urls.length} category URLs against ${BASE}`);

  const rows = [];
  let fail = 0;
  for (const url of urls) {
    const { status, text } = await fetchText(url);
    const count = WANT_COUNTS && status === 200 ? productCountHint(text) : null;
    const slug = url.replace(/^https?:\/\/[^/]+/, "");
    const line = `${status} ${slug}${count != null ? `  products≈${count}` : ""}`;
    console.log(line);
    rows.push({ url, status, count });
    if (status !== 200) fail++;
  }

  const ok = rows.filter((r) => r.status === 200).length;
  console.log(`\nSummary: ${ok}/${rows.length} returned 200`);
  if (fail) {
    console.error(`FAIL: ${fail} non-200`);
    process.exit(1);
  }
  console.log("OK: all category sitemap URLs returned 200");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
