#!/usr/bin/env node
/**
 * Internal link crawler (F1 / C21).
 *
 * Seeds: header/footer via home HTML, /shop, /categories, /cars, /blogs,
 * one category, one vehicle, one product, one blog post.
 * Follows every same-origin path link; fails on HTTP ≥400 or a redirect
 * whose final path differs from the requested path.
 *
 *   BASE_URL=https://crazzycars.pk node scripts/link-check.mjs
 *
 * Exit 0 on pass, 1 on hard failures. Never prints secrets.
 */
import { parseArgs } from "node:util";

const BASE = (process.env.BASE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const UA = "CrazzyCars-link-check/2026-10-28 (+https://crazzycars.pk)";
const TIMEOUT_MS = Number(process.env.LINK_CHECK_TIMEOUT_MS) || 25000;
const CONCURRENCY = Math.min(4, Number(process.env.LINK_CHECK_CONCURRENCY) || 4);

const { values: argv } = parseArgs({
  options: {
    json: { type: "boolean", default: false },
    quiet: { type: "boolean", default: false },
  },
  strict: false,
});

async function fetchOnce(url, { redirect = "manual" } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect,
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "text/html,text/plain,*/*" },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      status: res.status,
      location: res.headers.get("location") || "",
      body: buf.toString("utf8"),
      finalUrl: res.url || url,
    };
  } catch (err) {
    return {
      status: 0,
      location: "",
      body: "",
      finalUrl: url,
      error: String(err?.message || err).slice(0, 120),
    };
  } finally {
    clearTimeout(t);
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function pathOf(urlOrPath) {
  try {
    if (urlOrPath.startsWith("http")) return new URL(urlOrPath).pathname.replace(/\/+$/, "") || "/";
  } catch {
    /* ignore */
  }
  const p = String(urlOrPath || "").split("?")[0].split("#")[0];
  return (p.replace(/\/+$/, "") || "/") ;
}

function extractInternalPaths(html, base) {
  const out = new Set();
  const re = /(?:href|src)=["']([^"'#]+)/gi;
  let m;
  while ((m = re.exec(html || ""))) {
    let raw = m[1].trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    if (raw.startsWith("//")) raw = `https:${raw}`;
    let pathname = "";
    if (raw.startsWith("/")) pathname = raw.split("?")[0].split("#")[0];
    else if (raw.startsWith(base)) {
      try {
        pathname = new URL(raw).pathname;
      } catch {
        continue;
      }
    } else continue;
    if (!pathname || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) continue;
    if (/\.(png|jpe?g|webp|gif|svg|ico|css|js|map|woff2?|ttf|mp4|webm)$/i.test(pathname)) continue;
    out.add(pathname.replace(/\/+$/, "") || "/");
  }
  return [...out];
}

function pickFirst(paths, prefix) {
  return paths.find((p) => p.startsWith(prefix) && p !== prefix) || null;
}

async function resolveSeedPages() {
  const home = await fetchOnce(`${BASE}/`, { redirect: "follow" });
  if (home.status !== 200) {
    throw new Error(`home status ${home.status}${home.error ? ` (${home.error})` : ""}`);
  }
  const fromHome = extractInternalPaths(home.body, BASE);

  const seeds = new Set(["/", "/shop", "/categories", "/cars", "/blogs"]);
  for (const p of fromHome) {
    if (p === "/faq" || p === "/contact" || p === "/cash-on-delivery" || p === "/returns-policy" || p === "/shipping-policy") {
      seeds.add(p);
    }
  }

  // Discover one of each content type from hub pages
  const hubs = await mapPool(["/categories", "/cars", "/blogs", "/shop"], CONCURRENCY, async (p) => {
    const r = await fetchOnce(`${BASE}${p}`, { redirect: "follow" });
    return { p, status: r.status, paths: r.status === 200 ? extractInternalPaths(r.body, BASE) : [] };
  });

  for (const h of hubs) {
    seeds.add(h.p);
    if (h.p === "/categories") {
      const one = pickFirst(h.paths, "/categories/");
      if (one) seeds.add(one);
    }
    if (h.p === "/cars") {
      const one = pickFirst(h.paths, "/cars/");
      if (one) seeds.add(one);
    }
    if (h.p === "/blogs") {
      const one = pickFirst(h.paths, "/blogs/");
      if (one) seeds.add(one);
    }
    if (h.p === "/shop") {
      const product = h.paths.find((p) => {
        const segs = p.split("/").filter(Boolean);
        return segs.length === 1 && !["shop", "sale", "cart", "checkout", "account", "search", "compare", "wishlist"].includes(segs[0]);
      });
      if (product) seeds.add(product);
    }
  }

  return { seeds: [...seeds], homePaths: fromHome };
}

async function main() {
  const { seeds, homePaths } = await resolveSeedPages();
  if (!argv.quiet) {
    console.error(`link-check BASE=${BASE} seeds=${seeds.length} header/footer paths≈${homePaths.length}`);
  }

  const seedFetches = await mapPool(seeds, CONCURRENCY, async (p) => {
    const r = await fetchOnce(`${BASE}${p}`, { redirect: "follow" });
    return { path: p, status: r.status, body: r.body, error: r.error };
  });

  const toCheck = new Set(seeds);
  for (const s of seedFetches) {
    if (s.status === 200 && s.body) {
      for (const p of extractInternalPaths(s.body, BASE)) toCheck.add(p);
    }
  }

  const list = [...toCheck].sort();
  if (!argv.quiet) console.error(`checking ${list.length} unique internal paths`);

  const results = await mapPool(list, CONCURRENCY, async (p) => {
    const r = await fetchOnce(`${BASE}${p}`, { redirect: "manual" });
    const requested = pathOf(p);
    let ok = r.status === 200;
    let detail = "";
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const locPath = pathOf(r.location.startsWith("http") ? r.location : `${BASE}${r.location}`);
      if (locPath !== requested) {
        ok = false;
        detail = `redirect ${r.status} → ${locPath}`;
      } else {
        // same-path redirect (trailing slash etc.) — treat as pass if target 200
        const follow = await fetchOnce(`${BASE}${p}`, { redirect: "follow" });
        ok = follow.status === 200;
        detail = ok ? "" : `same-path redirect then ${follow.status}`;
      }
    } else if (r.status !== 200) {
      ok = false;
      detail = r.error ? `${r.status || "ERR"} ${r.error}` : `HTTP ${r.status}`;
    }
    return { path: p, ok, status: r.status, detail };
  });

  const failures = results.filter((r) => !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    seedCount: seeds.length,
    checked: results.length,
    failed: failures.length,
    seeds,
    failures: failures.slice(0, 80).map((f) => `${f.path} → ${f.detail || f.status}`),
  };

  if (argv.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`CHECKED ${report.checked} FAILED ${report.failed}`);
    for (const f of report.failures) console.log(`FAIL ${f}`);
    if (failures.length > report.failures.length) {
      console.log(`… +${failures.length - report.failures.length} more`);
    }
  }

  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err?.message || err);
  process.exit(2);
});
