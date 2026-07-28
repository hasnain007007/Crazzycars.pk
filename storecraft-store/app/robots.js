import { headers } from "next/headers";
import { getSiteUrl, isIndexableEnvironment } from "@/lib/siteUrl";

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
];

const PRIVATE_PATHS = ["/api/", "/account/", "/checkout/", "/cart/", "/admin/"];

export default async function robots() {
  const h = await headers();
  const siteUrl = getSiteUrl({ headers: h });
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
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl.replace(/^https?:\/\//, ""),
  };
}
