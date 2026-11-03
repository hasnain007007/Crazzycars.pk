import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getImageSitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getImageSitemapEntries);
