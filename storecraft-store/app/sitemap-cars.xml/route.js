import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getCarSitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getCarSitemapEntries);
