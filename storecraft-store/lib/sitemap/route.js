import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isIndexableEnvironment } from "@/lib/siteUrl";
import { buildSitemapIndexXml, buildUrlSetXml } from "@/lib/sitemap/xml";
import { getSitemapIndexEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";

function xmlResponse(body) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export function createUrlSetHandler(fetchEntries) {
  return async function GET() {
    if (!isIndexableEnvironment({ headers: await headers() })) {
      return xmlResponse(buildUrlSetXml([]));
    }
    try {
      const h = await headers();
      const entries = await fetchEntries(h);
      return xmlResponse(buildUrlSetXml(entries));
    } catch (e) {
      console.error("Sitemap child error:", e);
      return xmlResponse(buildUrlSetXml([]));
    }
  };
}

export async function GET() {
  if (!isIndexableEnvironment({ headers: await headers() })) {
    return xmlResponse(buildSitemapIndexXml([]));
  }
  try {
    const h = await headers();
    const indexEntries = await getSitemapIndexEntries(h);
    return xmlResponse(buildSitemapIndexXml(indexEntries));
  } catch (e) {
    console.error("Sitemap index error:", e);
    return xmlResponse(buildSitemapIndexXml([]));
  }
}
