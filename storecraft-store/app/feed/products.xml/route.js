import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { buildMerchantRssXml, productToMerchantItem } from "@/lib/merchantFeed";
import { getSiteUrl } from "@/lib/siteUrl";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

/**
 * Google Merchant Center–compatible product feed (RSS 2.0 + g: namespace).
 * Links use the request Host so they resolve on the current deployment URL.
 */
export async function GET() {
  try {
    const h = await headers();
    const site = getSiteUrl({ headers: h });

    await dbConnect();
    const products = await Product.find(STOREFRONT_PRODUCT_FILTER)
      .select(
        "name slug articleNo ean partNumber condition vendor shortDescription longDescription seo media pricing inventory categories updatedAt"
      )
      .populate("categories", "name slug")
      .sort({ updatedAt: -1 })
      .lean();

    const items = (products || [])
      .map((p) => productToMerchantItem(p, { siteUrl: site }))
      .filter((it) => it.id && it.title && it.link && it.image_link);

    const xml = buildMerchantRssXml(items, {
      title: "CrazzyCars.pk Products",
      link: site,
      description: "Active car accessories and auto parts catalog — CrazzyCars.pk",
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("product feed error:", e);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Error</title><description>${String(e.message || "Feed failed").replace(/[<>&]/g, "")}</description></channel></rss>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      }
    );
  }
}
