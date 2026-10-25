import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import Settings from "@/lib/models/Settings.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { productAllowsCod } from "@/lib/codEligibility";
import { loadShopByCarIndex } from "@/lib/vehiclePageData";
import { GENERATION_BY_SLUG } from "@/lib/seo/generationAliases";
import { PHONE_DISPLAY, PHONE_E164, schemaTelephone } from "@/lib/contact";
import { COD_SHORT, DELIVERY_SHORT, RETURNS_SHORT } from "@/lib/policy";
import { CITY_LANDING_SLUGS } from "@/lib/cityLandingPages";

export const revalidate = 3600;

const COMBO_SLUGS = [
  "honda-civic-reborn-2006-2012-carbon-interior-combo",
  "toyota-corolla-2014-2026-carbon-interior-combo",
];

/**
 * Descriptive llms.txt for AI crawlers — factual only, no ranking directives.
 * Only lists active categories with ≥1 live product (final URL, never redirects).
 * @see https://llmstxt.org/
 */
export async function GET() {
  const site = getSiteUrl();
  const waDisplay = PHONE_DISPLAY;
  const waE164 = schemaTelephone(PHONE_E164);

  let categoryLinks = [];
  let productLinks = [];
  let vehicleLinks = [];
  let comboLinks = [];
  let streetLine = "";
  let mapLine = "";
  let hoursLine = "Mon–Sat 9am–9pm PKT, Sunday closed";

  try {
    await dbConnect();
    const [cats, products, vehicles, settings, comboProducts] = await Promise.all([
      Category.find({ status: "active" }).select("name slug").sort({ sortOrder: 1, name: 1 }).lean(),
      Product.find(STOREFRONT_PRODUCT_FILTER)
        .select(
          "name slug pricing.regularPrice pricing.salePrice shortDescription featured isDeal inventory variationCombinations codEnabled categories"
        )
        .sort({ featured: -1, isDeal: -1, updatedAt: -1 })
        .limit(40)
        .lean(),
      loadShopByCarIndex(),
      Settings.findOne({ singletonKey: "default" })
        .select("general contactPage")
        .lean(),
      Product.find({
        ...STOREFRONT_PRODUCT_FILTER,
        slug: { $in: COMBO_SLUGS },
      })
        .select("name slug")
        .lean(),
    ]);

    const catIdsWithProducts = await Product.aggregate([
      { $match: STOREFRONT_PRODUCT_FILTER },
      { $unwind: "$categories" },
      { $group: { _id: "$categories", n: { $sum: 1 } } },
      { $match: { n: { $gte: 1 } } },
    ]);
    const liveCatIds = new Set(catIdsWithProducts.map((r) => String(r._id)));

    categoryLinks = (cats || [])
      .filter((c) => c.slug && liveCatIds.has(String(c._id)))
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

    comboLinks = (comboProducts || [])
      .filter((p) => p.slug)
      .map((p) => `- [${p.name}](${site}/${p.slug})`);

    const prioritySlugs = Object.keys(GENERATION_BY_SLUG);
    const bySlug = new Map((vehicles || []).filter((v) => v?.slug).map((v) => [v.slug, v]));
    const ordered = [];
    for (const slug of prioritySlugs) {
      if (bySlug.has(slug)) ordered.push(bySlug.get(slug));
    }
    for (const v of vehicles || []) {
      if (!v?.slug || prioritySlugs.includes(v.slug)) continue;
      ordered.push(v);
    }
    vehicleLinks = ordered.slice(0, 36).map((v) => {
      const entry = GENERATION_BY_SLUG[v.slug];
      const aka = entry?.aliases?.slice(0, 3).join(", ");
      const label = v.displayName || `${v.make || ""} ${v.model || ""}`.trim();
      const akaBit = aka ? ` (also: ${aka})` : "";
      return `- [${label}](${site}/cars/${v.slug})${akaBit}`;
    });

    const g = settings?.general || {};
    const street = String(g.streetAddress || "").trim();
    const locality = String(g.addressLocality || STORE_CONTACT.address.city || "Gujranwala").trim();
    const region = String(g.addressRegion || STORE_CONTACT.address.region || "Punjab").trim();
    const mapUrl = String(g.mapUrl || "").trim();
    if (street) {
      streetLine = `- Address: ${street}, ${locality}, ${region}`;
    } else {
      streetLine = `- Address: ${locality}, ${region}`;
    }
    if (mapUrl) mapLine = `- Map: ${mapUrl}`;
    const hours = String(g.businessHours || g.hoursText || "").trim();
    if (hours) hoursLine = hours;
  } catch {
    categoryLinks = [];
    productLinks = [];
    vehicleLinks = [];
    comboLinks = [];
    streetLine = `- Address: ${STORE_CONTACT.address.city}, ${STORE_CONTACT.address.region}`;
  }

  const cityLinks = CITY_LANDING_SLUGS.map(
    (c) => `- [Car accessories ${c}](${site}/car-accessories-${c})`
  ).join("\n");

  const body = `# CrazzyCars.pk

> Online car accessories store based in Gujranwala, Pakistan. Sells exterior styling (body kits, spoilers, splitters, mirror covers), interior trims, floor mats, LED lighting and accessories for Pakistani-market cars (Toyota, Honda, Suzuki, Hyundai, KIA, Changan, Haval, MG and more). Prices in PKR. Pakistan only.

## Store facts

- Hours: ${hoursLine}
${streetLine}
${mapLine ? `${mapLine}\n` : ""}- Phone: ${waDisplay} (${waE164})
- Delivery: ${DELIVERY_SHORT()}
- Payment / COD: ${COD_SHORT()} Body kits are prepaid (JazzCash or bank transfer).
- Returns: ${RETURNS_SHORT()}
- Contact: WhatsApp ${waDisplay} · ${STORE_CONTACT.email}
- Fitment: each product lists vehicle compatibility (make/model/years). Do not invent fitment beyond that table. Generation nicknames (Civic Reborn, Rebirth, Civic X, Corolla E140, etc.) are search aliases only.

## City pages

${cityLinks}

## Key pages

- [Shop all](${site}/shop) · [Shop by vehicle](${site}/cars) · [Categories](${site}/categories) · [Cash on Delivery](${site}/cash-on-delivery) · [Advance payment](${site}/advance-payment) · [Shipping](${site}/shipping-policy) · [Returns](${site}/returns-policy) · [FAQ](${site}/faq) · [Contact](${site}/contact)

## Machine-readable data

- Product catalogue (JSON, fitment per product): ${site}/feed/ai-catalog.json
- Product feed (XML): ${site}/feed/products.xml
- AI discovery: ${site}/.well-known/ai.json
- Sitemap: ${site}/sitemap.xml
- This file: ${site}/llms.txt

## Shop by vehicle (popular generations)

${vehicleLinks.length ? vehicleLinks.join("\n") : `- [Shop by car](${site}/cars)`}

## Categories (active with live products)

${categoryLinks.length ? categoryLinks.join("\n") : `- [Categories](${site}/categories)`}

## Combo products

${comboLinks.length ? comboLinks.join("\n") : `- See shop for current combos`}

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
