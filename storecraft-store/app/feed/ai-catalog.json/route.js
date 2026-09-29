import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { aiStoreManifest, productToAiCatalogItem } from "@/lib/aiCatalog";

export const dynamic = "force-dynamic";
export const revalidate = 600;

/**
 * Full AI shopping catalog (JSON) — agents use this to recommend products with
 * live price/stock/COD and attribution-tagged buy links.
 */
export async function GET(request) {
  try {
    const h = await headers();
    const site = getSiteUrl({ headers: h });
    const { searchParams } = new URL(request.url);
    const aiSource = String(searchParams.get("source") || "chatgpt").toLowerCase();
    const limitRaw = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(2000, Math.floor(limitRaw)) : 800;

    await dbConnect();
    const products = await Product.find(STOREFRONT_PRODUCT_FILTER)
      .select(
        "name slug articleNo vendor shortDescription pricing inventory variationCombinations categories codEnabled isBulky isUniversal fitment compatibleCars vehicleCompatibility featured isDeal updatedAt"
      )
      .populate("categories", "name slug")
      .sort({ featured: -1, isDeal: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    const items = (products || [])
      .map((p) => productToAiCatalogItem(p, { siteUrl: site, aiSource }))
      .filter(Boolean);

    const payload = {
      ...aiStoreManifest(site),
      generated_at: new Date().toISOString(),
      count: items.length,
      products: items,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
        "X-Robots-Tag": "all",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "AI catalog failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
