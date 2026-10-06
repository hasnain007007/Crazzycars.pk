import { headers } from "next/headers";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { productAllowsCod } from "@/lib/codEligibility";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Descriptive llms.txt for AI crawlers — factual only, no ranking directives.
 * @see https://llmstxt.org/
 */
export async function GET() {
  const h = await headers();
  const site = getSiteUrl({ headers: h });
  const wa = STORE_CONTACT.whatsapp;
  const waE164 = STORE_CONTACT.phoneE164;
  const shipStd = STORE_POLICY.shipping.standardFeePKR;
  const shipBulky = STORE_POLICY.shipping.bulkyFeePKR;

  let categoryLinks = [];
  let productLinks = [];
  try {
    await dbConnect();
    const [cats, products] = await Promise.all([
      Category.find({ status: "active" })
        .select("name slug")
        .sort({ sortOrder: 1, name: 1 })
        .limit(40)
        .lean(),
      Product.find(STOREFRONT_PRODUCT_FILTER)
        .select(
          "name slug pricing.regularPrice pricing.salePrice shortDescription featured isDeal inventory variationCombinations codEnabled"
        )
        .sort({ featured: -1, isDeal: -1, updatedAt: -1 })
        .limit(40)
        .lean(),
    ]);
    categoryLinks = (cats || [])
      .filter((c) => c.slug)
      .map((c) => `- [${c.name}](${site}/categories/${c.slug})`);
    productLinks = (products || [])
      .filter((p) => p.slug)
      .map((p) => {
        const sale = Number(p.pricing?.salePrice);
        const regular = Number(p.pricing?.regularPrice);
        const price =
          Number.isFinite(sale) && sale > 0 && sale < regular
            ? sale
            : Number.isFinite(regular)
              ? regular
              : null;
        const priceBit = price != null ? ` — PKR ${Math.round(price).toLocaleString("en-PK")}` : "";
        const cod = productAllowsCod(p) ? "COD eligible" : "prepaid";
        return `- [${p.name}](${site}/${p.slug})${priceBit} · ${cod}`;
      });
  } catch {
    categoryLinks = [];
    productLinks = [];
  }

  const body = `# CrazzyCars.pk

> Online car accessories store based in Gujranwala, Pakistan. Sells exterior styling (body kits, spoilers, splitters, mirror covers), interior trims, floor mats, LED lighting and accessories for Pakistani-market cars (Toyota, Honda, Suzuki, Hyundai, KIA, Changan, Haval, MG and more). Prices in PKR.

## Store facts

- Delivery: nationwide via courier. Rs ${shipStd} regular, Rs ${shipBulky} if the order has bulky items (splitters, side skirts, spoilers, floor mats, body kits). Delivery fee paid in advance where required.
- Payment: Cash on Delivery on eligible items (product amount paid on delivery); body kits are prepaid (JazzCash or bank transfer).
- Returns: within ${STORE_POLICY.returns.windowDays} days only if the item is defective or the wrong item was shipped (full refund). No change-of-mind returns.
- Contact: WhatsApp ${wa} (E.164 ${waE164}) · ${STORE_CONTACT.email} · ${STORE_CONTACT.address.city}, ${STORE_CONTACT.address.region}

## Key pages

- [Shop all](${site}/shop) · [Shop by vehicle](${site}/cars) · [Cash on Delivery](${site}/cash-on-delivery) · [Shipping](${site}/shipping-policy) · [Returns](${site}/returns-policy) · [FAQ](${site}/faq) · [Contact](${site}/contact)

## Machine-readable data

- Product catalogue (JSON, fitment per product): ${site}/feed/ai-catalog.json
- Product feed (XML): ${site}/feed/products.xml
- AI discovery: ${site}/.well-known/ai.json
- Sitemap: ${site}/sitemap.xml
- This file: ${site}/llms.txt

## Categories

${categoryLinks.length ? categoryLinks.join("\n") : `- [Categories](${site}/categories)`}

## Sample products

${productLinks.length ? productLinks.join("\n") : `See ${site}/feed/ai-catalog.json for the full catalogue.`}
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
