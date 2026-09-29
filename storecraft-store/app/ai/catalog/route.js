import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import {
  aiStoreManifest,
  filterAiCatalogItems,
  productToAiCatalogItem,
} from "@/lib/aiCatalog";

export const dynamic = "force-dynamic";
export const revalidate = 300;

/**
 * Searchable AI catalog — ?q=led&make=honda&model=civic&in_stock=1&source=chatgpt
 */
export async function GET(request) {
  try {
    const h = await headers();
    const site = getSiteUrl({ headers: h });
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const make = searchParams.get("make") || "";
    const model = searchParams.get("model") || "";
    const inStockOnly = /^(1|true|yes)$/i.test(String(searchParams.get("in_stock") || ""));
    const aiSource = String(searchParams.get("source") || "chatgpt").toLowerCase();
    const limitRaw = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 24;

    await dbConnect();
    // Broader fetch then filter in memory — fitment is nested and hard to query cleanly.
    const products = await Product.find(STOREFRONT_PRODUCT_FILTER)
      .select(
        "name slug articleNo vendor shortDescription pricing inventory variationCombinations categories codEnabled isBulky isUniversal fitment compatibleCars vehicleCompatibility featured isDeal updatedAt"
      )
      .populate("categories", "name slug")
      .sort({ featured: -1, updatedAt: -1 })
      .limit(600)
      .lean();

    const mapped = (products || [])
      .map((p) => productToAiCatalogItem(p, { siteUrl: site, aiSource }))
      .filter(Boolean);

    const matched = filterAiCatalogItems(mapped, { q, make, model, inStockOnly }).slice(0, limit);

    return NextResponse.json(
      {
        ...aiStoreManifest(site),
        query: { q, make, model, in_stock: inStockOnly, source: aiSource, limit },
        generated_at: new Date().toISOString(),
        count: matched.length,
        products: matched,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
          "Access-Control-Allow-Origin": "*",
          "X-Robots-Tag": "all",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "AI catalog search failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
