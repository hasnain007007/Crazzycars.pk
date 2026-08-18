import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getPageSitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getPageSitemapEntries);
