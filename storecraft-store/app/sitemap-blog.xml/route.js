import { createUrlSetHandler } from "@/lib/sitemap/route";
import { getBlogSitemapEntries } from "@/lib/sitemap/entries";

export const dynamic = "force-dynamic";
export const GET = createUrlSetHandler(getBlogSitemapEntries);
