import { headers } from "next/headers";
import { getSiteUrl, isIndexableEnvironment } from "@/lib/siteUrl";
import { buildRobotsDisallowList } from "@/lib/seo/robotsTxt";

/** Always evaluate at request time so Coolify runtime INDEXABLE env is honored. */
export const dynamic = "force-dynamic";

/** AI shopping / citation crawlers — explicitly allowed (same as * today; listed for clarity). */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Googlebot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "meta-externalagent",
  "Meta-ExternalAgent",
  "DeepSeekBot",
  "Bytespider",
  "Amazonbot",
  "CCBot",
  "cohere-ai",
];

export default async function robots() {
  const h = await headers();
  const siteUrl = getSiteUrl({ headers: h });
  const host = siteUrl.replace(/^https?:\/\//, "");
  const disallow = buildRobotsDisallowList();

  if (!isIndexableEnvironment({ headers: h })) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow,
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
