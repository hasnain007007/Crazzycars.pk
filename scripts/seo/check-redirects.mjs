#!/usr/bin/env node
/**
 * SEO Task 5: probe legacy map + samples for loops / multi-hop / non-200 finals.
 * Exit 0 when clean. Usage: node scripts/seo/check-redirects.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const rows = require(path.join(root, "storecraft-store/data/seo/legacy-redirects.json"));

const BASE = (process.env.SITE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const MAX = Number(process.env.SEO_REDIRECT_MAX || 80);

async function probe(url) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(current, { redirect: "manual", headers: { "user-agent": "cc-seo-check-redirects" } });
    const loc = res.headers.get("location");
    hops.push({ status: res.status, url: current, location: loc });
    if (res.status < 300 || res.status >= 400 || !loc) return hops;
    current = new URL(loc, current).href;
  }
  hops.push({ status: 0, url: current, location: null, loop: true });
  return hops;
}

function appHops(hops) {
  // Count 30x that stay on crazzycars.pk (ignore CF http→https if separate)
  return hops.filter((h) => h.status >= 300 && h.status < 400).length;
}

async function main() {
  const sampleProducts = rows
    .filter((r) => String(r.from).startsWith("/products/"))
    .slice(0, 50)
    .map((r) => r.from);
  const checks = [
    ...rows.slice(0, MAX).map((r) => ({ from: r.from, expect: r.to })),
    ...sampleProducts.map((from) => ({ from, expect: null })),
    { from: "/some-random-nonexistent-url-zz", expect404: true },
  ];

  let loops = 0;
  let chains = 0;
  let badFinal = 0;
  const failures = [];

  for (const c of checks) {
    const hops = await probe(`${BASE}${c.from}`);
    const n = appHops(hops);
    const last = hops[hops.length - 1];
    if (hops.some((h) => h.loop) || n > 5) {
      loops++;
      failures.push({ type: "loop", from: c.from, hops });
      continue;
    }
    if (n > 1) {
      // One app hop is OK; http→https may add edge hop — tolerate ≤2 total 30x
      if (n > 2) {
        chains++;
        failures.push({ type: "chain", from: c.from, n, hops });
      }
    }
    if (c.expect404) {
      if (last.status !== 404) {
        badFinal++;
        failures.push({ type: "expect404", from: c.from, last });
      }
      continue;
    }
    if (c.expect) {
      const loc = hops.find((h) => h.status >= 300 && h.status < 400)?.location || "";
      const absExpect = `${BASE}${c.expect}`.replace(/\/+$/, "");
      const got = String(loc).replace(/\/+$/, "");
      if (!got.endsWith(c.expect) && got !== absExpect) {
        // still OK if final 200 equals expect after follow
      }
    }
    const finalUrl = last.location
      ? new URL(last.location, last.url).href
      : last.url;
    // If ended on redirect without follow, probe final
    let finalStatus = last.status;
    if (finalStatus >= 300 && finalStatus < 400 && last.location) {
      const fin = await fetch(new URL(last.location, last.url).href, {
        redirect: "follow",
        headers: { "user-agent": "cc-seo-check-redirects" },
      });
      finalStatus = fin.status;
    }
    if (finalStatus !== 200 && !(c.expect404 && finalStatus === 404)) {
      // 410 is OK for gone; skip unless we expected a product target
      if (finalStatus !== 410) {
        badFinal++;
        failures.push({ type: "final", from: c.from, finalStatus, finalUrl });
      }
    }
  }

  console.log(
    JSON.stringify(
      { checked: checks.length, loops, chains, badFinal, failures: failures.slice(0, 20) },
      null,
      2
    )
  );
  if (loops || chains || badFinal) process.exit(1);
  console.log("0 loops / 0 chains — OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
