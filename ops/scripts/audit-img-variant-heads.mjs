#!/usr/bin/env node
/**
 * Post-deploy / nightly: crawl sitemap + key pages, HEAD every <img> src/srcset
 * media URL, report 404s (especially -800/-1200 derivatives).
 *
 * Usage:
 *   node ops/scripts/audit-img-variant-heads.mjs
 *   BASE_URL=https://crazzycars.pk node ops/scripts/audit-img-variant-heads.mjs
 *   OUT=/tmp/img-head-audit.json node ops/scripts/audit-img-variant-heads.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = String(process.env.BASE_URL || "https://crazzycars.pk").replace(/\/+$/, "");
const OUT =
  process.env.OUT ||
  path.join(
    process.cwd(),
    "ops/reports",
    `img-head-audit-${new Date().toISOString().slice(0, 10)}.json`
  );
const CONCURRENCY = Math.max(4, Math.min(24, Number(process.env.CONCURRENCY) || 12));
const UA = "CrazzyCarsImgHeadAudit/1.0";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xml,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function locsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function imgMediaUrls(html) {
  const h = String(html || "")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/");
  const urls = new Set();
  for (const m of h.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    for (const attr of ["src", "srcset", "srcSet"]) {
      const am = tag.match(new RegExp(`${attr}="([^"]*)"`, "i"));
      if (!am) continue;
      for (const part of am[1].split(",")) {
        let u = part.trim().split(/\s+/)[0];
        if (!u || !u.includes("/media/")) continue;
        if (u.startsWith("/")) u = `${BASE}${u}`;
        urls.add(u.split("?")[0]);
      }
    }
  }
  return [...urls];
}

async function headOne(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    const cl = res.headers.get("content-length");
    return {
      url,
      status: res.status,
      bytes: cl && /^\d+$/.test(cl) ? Number(cl) : null,
      ok: res.status === 200,
    };
  } catch (e) {
    return { url, status: 0, bytes: null, ok: false, error: String(e?.message || e) };
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

async function main() {
  const seed = [
    `${BASE}/`,
    `${BASE}/shop`,
    `${BASE}/sale`,
    `${BASE}/sitemap-products.xml`,
    `${BASE}/sitemap-categories.xml`,
    `${BASE}/sitemap-pages.xml`,
  ];
  const pages = new Set([`${BASE}/`, `${BASE}/shop`, `${BASE}/sale`]);
  for (const s of seed.filter((u) => u.endsWith(".xml"))) {
    try {
      const xml = await fetchText(s);
      for (const loc of locsFromSitemap(xml)) {
        if (loc.startsWith(BASE)) pages.add(loc.split("?")[0]);
      }
    } catch (e) {
      console.warn("sitemap fail", s, e.message);
    }
  }

  console.log(JSON.stringify({ phase: "pages", count: pages.size }));
  const pageList = [...pages];
  const allUrls = new Set();
  const pageFails = [];
  await mapPool(pageList, 6, async (pageUrl) => {
    try {
      const html = await fetchText(pageUrl);
      for (const u of imgMediaUrls(html)) allUrls.add(u);
    } catch (e) {
      pageFails.push({ pageUrl, error: String(e.message || e) });
    }
  });

  const urls = [...allUrls];
  console.log(JSON.stringify({ phase: "head", urls: urls.length }));
  const results = await mapPool(urls, CONCURRENCY, headOne);
  const fails = results.filter((r) => !r.ok);
  const variantFails = fails.filter((r) => /-(400|800|1200|sm)\.webp$/i.test(r.url));
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    pages: pageList.length,
    pageFails,
    imgUrls: urls.length,
    ok: results.filter((r) => r.ok).length,
    fail: fails.length,
    variantFails: variantFails.length,
    fails: fails.map((f) => ({ status: f.status, url: f.url, error: f.error || null })),
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: fails.length === 0,
        out: OUT,
        pages: report.pages,
        imgUrls: report.imgUrls,
        fail: report.fail,
        variantFails: report.variantFails,
        sampleFails: fails.slice(0, 15).map((f) => f.url),
      },
      null,
      2
    )
  );
  if (fails.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
