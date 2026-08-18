import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getCategorySitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getCategorySitemapEntries);
