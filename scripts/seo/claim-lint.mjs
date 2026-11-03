#!/usr/bin/env node
/**
 * Fail if rendered HTML / llms.txt contains banned claim words outside product name/slug URLs.
 * Usage: node scripts/seo/claim-lint.mjs
 */
const BASE = (process.env.SITE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const PATHS = [
  "/",
  "/about",
  "/faq",
  "/cash-on-delivery",
  "/llms.txt",
  "/toyota-corolla-2008-2010-diamond-style-chrome-front-grille",
  "/batman-style-side-mirror-cover-toyota-aqua-2012-present",
  "/categories/body-kits-extensions",
  "/categories/led-lighting",
  "/cars/haval-h6-2021-present",
  "/cars/toyota-prius-2004-2009",
];

const CLAIM_RE = /\b(best|#1|oem|genuine|original|perfect|premium|100%)\b/gi;

function scrubUrls(text) {
  return String(text || "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, " ")
    .replace(/href=["'][^"']+["']/gi, " ")
    .replace(/\/[a-z0-9-]*premium[a-z0-9-]*/gi, " ");
}

async function main() {
  const hits = [];
  for (const p of PATHS) {
    const res = await fetch(`${BASE}${p}`, {
      headers: { "user-agent": "cc-claim-lint" },
      redirect: "follow",
    });
    const body = scrubUrls(await res.text());
    let m;
    CLAIM_RE.lastIndex = 0;
    while ((m = CLAIM_RE.exec(body))) {
      const start = Math.max(0, m.index - 40);
      const snippet = body.slice(start, m.index + m[0].length + 40).replace(/\s+/g, " ");
      hits.push({ path: p, word: m[0], snippet });
    }
  }
  if (hits.length) {
    console.error(JSON.stringify({ fail: hits.length, hits: hits.slice(0, 40) }, null, 2));
    process.exit(1);
  }
  console.log("claim-lint OK", PATHS.length, "paths");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
