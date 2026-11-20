#!/usr/bin/env node
/**
 * Fail if merchant feed is non-200 or has zero <item>s.
 * Usage: node ops/scripts/check-merchant-feed.mjs [url]
 */
const url = process.argv[2] || "https://crazzycars.pk/feed/products.xml";

const res = await fetch(url, {
  headers: { "User-Agent": "CrazzyCars-Feed-Check/1.0", "Cache-Control": "no-cache" },
  signal: AbortSignal.timeout(120_000),
});
const body = await res.text();
const items = (body.match(/<item>/g) || []).length;
const errTitle = /<title>Error<\/title>/i.test(body);
const bulkyBug = /bulky is not defined/i.test(body);

console.log(
  JSON.stringify(
    { url, status: res.status, bytes: body.length, items, errTitle, bulkyBug },
    null,
    2
  )
);

if (res.status !== 200 || items < 1 || errTitle || bulkyBug) {
  console.error("FAIL merchant feed health check");
  process.exit(1);
}
console.log("OK merchant feed");
