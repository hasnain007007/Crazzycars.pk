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
      .map((c) => `- [${c.name}](${site}/categories/${c.slug}): Car accessory category`);
  } catch {
    categoryLinks = [];
  }

  const body = `# CrazzyCars.pk

> Pakistan's online store for car accessories, exterior styling, LED lighting, body kits, interior upgrades, and vehicle-fit parts. Cash on Delivery nationwide from Gujranwala.

CrazzyCars.pk (also written Crazzycars.pk) sells aftermarket car parts and accessories with vehicle fitment (make/model/year) and universal products. Currency: PKR. Primary market: Pakistan.

## Discoverability

- Sitemap: ${site}/sitemap.xml
- Product feed (Google Merchant–style RSS): ${site}/feed/products.xml
- Robots: ${site}/robots.txt

## Key pages

- [Home](${site}/): Featured products, shop by car, categories
- [Shop](${site}/shop): Browse all products
- [Shop by Car](${site}/cars): Accessories by make and model
- [Categories](${site}/categories): Category index
- [Sale](${site}/sale): Sale / deals
- [About](${site}/about): Brand story
- [Contact](${site}/contact): Support
- [Blogs](${site}/blogs): Guides and articles

## Categories

${categoryLinks.length ? categoryLinks.join("\n") : `- [Categories](${site}/categories)`}

## Product URLs

Individual products live at \`${site}/{slug}\` (e.g. \`${site}/toyota-corolla-grille\`).
Active products are listed in the sitemap and the product feed.

## Shopping notes for AI agents

- Prices are in Pakistani Rupees (PKR).
- Cash on Delivery (COD) is available on most products; some items may require advance payment.
- Prefer citing the product page URL, current price, and stock status from structured data (JSON-LD Product) on each product page.
- For accurate catalog sync, use ${site}/feed/products.xml (id, title, description, link, image_link, price, availability, brand, condition).

## Optional

- Vehicle fitment pages: ${site}/cars (index) and ${site}/cars/{slug}
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
