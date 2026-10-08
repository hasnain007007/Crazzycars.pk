import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-static";
export const revalidate = 86400;

/**
 * Short pointer file for AI agents that look for /ai.txt.
 * Canonical facts live in /llms.txt and /.well-known/ai.json.
 */
export async function GET() {
  const h = await headers();
  const site = getSiteUrl({ headers: h });
  const body = `# CrazzyCars.pk AI discovery

contact: ${site}/contact
llms: ${site}/llms.txt
catalog: ${site}/feed/ai-catalog.json
discovery: ${site}/.well-known/ai.json
sitemap: ${site}/sitemap.xml
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
