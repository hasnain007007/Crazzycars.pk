import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getProductSitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getProductSitemapEntries);
