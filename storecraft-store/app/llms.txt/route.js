import { headers } from "next/headers";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Emerging llms.txt convention — plain-text map of the site for LLM crawlers.
 * Base URL follows the request Host (Vercel URL now → custom domain later, zero code change).
 * @see https://llmstxt.org/
 */
export async function GET() {
  const h = await headers();
  const site = getSiteUrl({ headers: h });
  let categoryLinks = [];
  try {
    await dbConnect();
    const cats = await Category.find({ status: "active" })
      .select("name slug")
      .sort({ sortOrder: 1, name: 1 })
      .limit(40)
      .lean();
    categoryLinks = (cats || [])
      .filter((c) => c.slug)
      .map((c) => `- [${c.name}](${site}/categories/${c.slug}): Product category`);
  } catch {
    categoryLinks = [];
  }

  const body = `# Homefy.pk

> Pakistan's online store for kitchen accessories, beauty & travel bags (makeup pouches, toiletry kits) and ladies bags. Cash on Delivery nationwide.

Homefy.pk sells kitchen accessories (cookware, storage, cutlery, dining), beauty & travel bags (makeup pouches, travel toiletry bags, vanity organizers) and ladies bags (mini handbags, totes, crossbody bags, clutches). Currency: PKR. Primary market: Pakistan.

## Discoverability

- Sitemap: ${site}/sitemap.xml
- Product feed (Google Merchant–style RSS): ${site}/feed/products.xml
- Robots: ${site}/robots.txt

## Key pages

- [Home](${site}/): Featured products and shop by category
- [Shop](${site}/shop): Browse all products
- [Categories](${site}/categories): Category index
- [Sale](${site}/sale): Sale / deals
- [About](${site}/about): Brand story
- [Contact](${site}/contact): Support
- [Blogs](${site}/blogs): Guides and articles

## Categories

${categoryLinks.length ? categoryLinks.join("\n") : `- [Categories](${site}/categories)`}

## Product URLs

Individual products live at \`${site}/{slug}\`.
Active products are listed in the sitemap and the product feed.

## Shopping notes for AI agents

- Prices are in Pakistani Rupees (PKR).
- Cash on Delivery (COD) is available on most products; some items may require advance payment.
- Prefer citing the product page URL, current price, and stock status from structured data (JSON-LD Product) on each product page.
- For accurate catalog sync, use ${site}/feed/products.xml (id, title, description, link, image_link, price, availability, brand, condition).
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
