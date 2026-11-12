import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Product from "@/lib/models/Product.model";
import Settings from "@/lib/models/Settings.model";
import {
  KEY_PATHS,
  absoluteMediaUrl,
  analyseProducts,
  checkPage,
  imageOk,
  mapLimit,
  sitemapUrls,
  storeBaseUrl,
} from "@/lib/siteCheck";

/**
 * Admin › Website Check. Read-only. The page calls it part by part:
 *   GET  ?part=plan               → pages + photos to check
 *   POST { part: "pages", urls }  → ≤ 40 pages
 *   POST { part: "images", images } → ≤ 150 photos
 *   POST { part: "catalog" }      → product data
 *   POST { part: "functions" }    → coupon, delivery, tracking, product APIs, tracking setup
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

function guard(request) {
  return denyUnlessCapability(getRequestUser(request), "canManageSettings");
}

export async function GET(request) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const base = storeBaseUrl();
    let sitemap = [];
    let sitemapError = "";
    try {
      sitemap = await sitemapUrls(base);
    } catch (e) {
      sitemapError = String(e?.message || e);
    }
    const inSitemap = new Set(sitemap);
    const pages = [...new Set([...KEY_PATHS.map((p) => base + p), ...sitemap])].map((url) => ({
      url,
      inSitemap: inSitemap.has(url),
    }));

    await dbConnect();
    const products = await Product.find({ status: { $regex: /^(active|draft)$/i } })
      .select("name articleNo status media.images.url")
      .lean();
    const images = [];
    for (const p of products) {
      for (const img of p.media?.images || []) {
        const url = absoluteMediaUrl(img?.url, base);
        if (url) images.push({ url, sku: p.articleNo || "", name: p.name || "", productId: String(p._id), status: p.status });
      }
    }
    return json({ success: true, base, sitemapError, pages, images });
  } catch (e) {
    return json({ success: false, error: e.message || "Could not plan the check." }, 500);
  }
}

async function functionChecks() {
  const base = storeBaseUrl();
  const results = [];
  const run = async (name, fn) => {
    try {
      const r = await fn();
      results.push({ name, ok: r.ok, level: r.ok ? "ok" : r.level || "error", detail: r.detail || "" });
    } catch (e) {
      results.push({ name, ok: false, level: "error", detail: String(e?.message || e).slice(0, 160) });
    }
  };
  const get = (path) => fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(20000) });

  await run("Coupon code box answers", async () => {
    const r = await fetch(`${base}/api/coupon/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ZZ-CHECK-NOT-REAL", orderAmount: 3000, categoryIds: [] }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    const ok = r.ok && j.success === true && j.valid === false && Boolean(j.message);
    return { ok, detail: ok ? `Unknown code → “${j.message}”` : `HTTP ${r.status} ${JSON.stringify(j).slice(0, 120)}` };
  });
  await run("Delivery charge (Lahore, Rs 3,000)", async () => {
    const r = await get("/api/shipping/calculate?province=Punjab&city=Lahore&total=3000");
    const j = await r.json().catch(() => ({}));
    const cost = Number(j.shippingCost ?? j.rate);
    const ok = r.ok && j.success !== false && Number.isFinite(cost);
    return { ok, detail: ok ? `Rs ${cost}, ${j.estimatedDays || ""}` : `HTTP ${r.status}` };
  });
  await run("Order tracking answers", async () => {
    const r = await get("/api/tracking?trackingNumber=ORD-0000-0");
    const j = await r.json().catch(() => null);
    const ok = Boolean(j) && r.status < 500;
    return { ok, detail: ok ? `Unknown order → “${j.error || j.status}”` : `HTTP ${r.status}` };
  });
  for (const [name, path, key] of [
    ["Product list", "/api/products?limit=1", "products"],
    ["Hot Deals", "/api/products/deals?filter=all&limit=1", "products"],
    ["Best Sellers", "/api/products/best-sellers", "products"],
  ]) {
    await run(name, async () => {
      const r = await get(path);
      const j = await r.json().catch(() => ({}));
      const list = j[key] || j.data?.[key] || j.data;
      const ok = r.ok && Array.isArray(list);
      return { ok, detail: ok ? `${Array.isArray(list) ? list.length : 0}+ items` : `HTTP ${r.status}` };
    });
  }

  await dbConnect();
  const st = (await Settings.findOne({ singletonKey: "default" }).lean()) || (await Settings.findOne({}).lean()) || {};
  const seo = st.seo || {};
  results.push({
    name: "Meta Pixel",
    ok: Boolean(seo.facebookPixelId),
    level: seo.facebookPixelId ? "ok" : "warn",
    detail: seo.facebookPixelId ? `Pixel ${seo.facebookPixelId}` : "No Pixel ID in Settings › SEO.",
  });
  const capi = Boolean(process.env.META_CAPI_ACCESS_TOKEN || seo.metaCapiAccessToken);
  results.push({
    name: "Meta Conversions API (server events)",
    ok: capi,
    level: capi ? "ok" : "warn",
    detail: capi ? "Access token set." : "No access token — server events are skipped. Add it in Settings › SEO.",
  });
  results.push({
    name: "Google Analytics",
    ok: Boolean(seo.googleAnalyticsId),
    level: seo.googleAnalyticsId ? "ok" : "warn",
    detail: seo.googleAnalyticsId ? `ID ${seo.googleAnalyticsId}` : "No GA4 ID set.",
  });
  return results;
}

export async function POST(request) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const part = String(body.part || "");
    if (part === "pages") {
      const urls = (Array.isArray(body.urls) ? body.urls : []).slice(0, 40);
      const results = await mapLimit(urls, 6, (u) => checkPage(u.url, { inSitemap: Boolean(u.inSitemap) }));
      return json({ success: true, results });
    }
    if (part === "images") {
      const images = (Array.isArray(body.images) ? body.images : []).slice(0, 150);
      const ok = await mapLimit(images, 12, (i) => imageOk(i.url));
      return json({ success: true, broken: images.filter((_, k) => !ok[k]) });
    }
    if (part === "catalog") {
      await dbConnect();
      const products = await Product.find({ status: { $regex: /^(active|draft)$/i } })
        .select("name articleNo status media.images.url pricing categories inventory")
        .lean();
      return json({ success: true, total: products.length, issues: analyseProducts(products) });
    }
    if (part === "functions") {
      return json({ success: true, results: await functionChecks() });
    }
    return json({ success: false, error: "Unknown part." }, 400);
  } catch (e) {
    return json({ success: false, error: e.message || "Check failed." }, 500);
  }
}
