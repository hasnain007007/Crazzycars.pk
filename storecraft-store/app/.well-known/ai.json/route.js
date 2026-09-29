import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/siteUrl";
import { aiStoreManifest } from "@/lib/aiCatalog";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Discovery manifest for AI agents — points at catalog, llms.txt, and how to recommend.
 */
export async function GET() {
  const h = await headers();
  const site = getSiteUrl({ headers: h });
  const manifest = aiStoreManifest(site);

  return NextResponse.json(
    {
      version: "1.0",
      ...manifest,
      api: {
        type: "opencatalog",
        catalog_url: `${site}/feed/ai-catalog.json`,
        search_url: `${site}/ai/catalog?q={query}`,
        auth: "none",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Robots-Tag": "all",
      },
    }
  );
}
