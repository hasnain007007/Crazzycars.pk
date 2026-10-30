import { headers } from "next/headers";
import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { productAllowsCod } from "@/lib/codEligibility";
import { COD_LINE, PREPAID_LINE, TRUST_LINE } from "@/lib/paymentCopy";
import { loadShopByCarIndex } from "@/lib/vehiclePageData";
import { GENERATION_BY_SLUG, aliasesForSlug } from "@/lib/seo/generationAliases";
import { getServerStoreSettings } from "@/lib/serverSettings";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const MAX_BYTES = 30 * 1024;

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
  let vehicleLinks = [];
  let shopAddress = `${STORE_CONTACT.address.city}, ${STORE_CONTACT.address.region}`;
  try {
    await dbConnect();
    const settings = await getServerStoreSettings().catch(() => null);
    const g = settings?.general || {};
    const street = String(g.streetAddress || "").trim();
    const city = String(g.addressLocality || STORE_CONTACT.address.city || "Gujranwala").trim();
    const region = String(g.addressRegion || STORE_CONTACT.address.region || "Punjab").trim();
    shopAddress = [street, city, region].filter(Boolean).join(", ");

    const [cats, products, vehicles, catCounts] = await Promise.all([
      Category.find({ status: "active" })
        .select("name slug")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.find(WEBSITE_PRODUCT_FILTER)
        .select(
          "name slug pricing.regularPrice pricing.salePrice featured isDeal inventory variationCombinations codEnabled codEligible categories"
        )
        .sort({ featured: -1, isDeal: -1, updatedAt: -1 })
        .limit(24)
        .lean(),
      loadShopByCarIndex(),
      // Must use WEBSITE_PRODUCT_FILTER (not an undefined STOREFRONT_* alias) —
      // a ReferenceError here previously emptied all three lists (F2 regression).
      Product.aggregate([
        { $match: WEBSITE_PRODUCT_FILTER },
        { $unwind: "$categories" },
        { $group: { _id: "$categories", n: { $sum: 1 } } },
        { $match: { n: { $gte: 1 } } },
      ]),
    ]);

    const liveCatIds = new Set((catCounts || []).map((r) => String(r._id)));
    const CANONICAL_CAT = {
      "luxury-7d-9d-floor-mats": "floor-mats",
      "trunk-mats": "floor-mats",
    };
    const seenSlugs = new Set();
    categoryLinks = (cats || [])
      .filter((c) => c.slug && liveCatIds.has(String(c._id)))
      .map((c) => {
        const slug = CANONICAL_CAT[c.slug] || c.slug;
        return { ...c, slug };
      })
      .filter((c) => {
        if (seenSlugs.has(c.slug)) return false;
        seenSlugs.add(c.slug);
        return true;
      })
      .map((c) => `- [${c.name}](${site}/categories/${c.slug})`);

    productLinks = (products || [])
      .filter((p) => p.slug)
      .slice(0, 20)
      .map((p) => {
        const sale = Number(p.pricing?.salePrice);
        const regular = Number(p.pricing?.regularPrice);
        const price =
          Number.isFinite(sale) && sale > 0 && (!Number.isFinite(regular) || sale < regular)
            ? sale
            : Number.isFinite(regular)
              ? regular
              : null;
        const priceBit = price != null ? ` — PKR ${Math.round(price).toLocaleString("en-PK")}` : "";
        const cod = productAllowsCod(p) ? "COD eligible" : "prepaid";
        return `- [${p.name}](${site}/${p.slug})${priceBit} · ${cod}`;
      });

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
    // loadShopByCarIndex already drops cars with 0 active products.
    vehicleLinks = ordered.map((v) => {
      const label = v.displayName || `${v.make || ""} ${v.model || ""}`.trim() || v.slug;
      const entry = aliasesForSlug(v.slug) || null;
      const also = Array.isArray(entry?.aliases) ? entry.aliases.filter(Boolean).slice(0, 4) : [];
      const alsoBit = also.length ? ` (also: ${also.join(", ")})` : "";
      return `- [${label}](${site}/cars/${v.slug})${alsoBit}`;
    });
  } catch (err) {
    console.error("[llms.txt] catalogue query failed:", err?.message || err);
    categoryLinks = [];
    productLinks = [];
    vehicleLinks = [];
  }

  const preamble = `# CrazzyCars.pk

> Online car accessories store based in Gujranwala, Pakistan. Sells exterior styling (body kits, spoilers, splitters, mirror covers), interior trims, floor mats, LED lighting and accessories for Pakistani-market cars (Toyota, Honda, Suzuki, Hyundai, KIA, Changan, Haval, MG and more). Prices in PKR.

## Store facts

- Founded: 2023
- Shop: Gujranwala, Punjab (${shopAddress})
- ${TRUST_LINE}
- Delivery: nationwide via courier. Rs ${shipStd} regular, Rs ${shipBulky} if the order has bulky items (splitters, side skirts, spoilers, floor mats, body kits). Delivery fee paid in advance where required.
- Payment: ${COD_LINE}; body kits — ${PREPAID_LINE}.
- Returns: within ${STORE_POLICY.returns.windowDays} days only if the item is defective or the wrong item was shipped (full refund). No change-of-mind returns.
- Contact: WhatsApp ${wa} (E.164 ${waE164}) · ${STORE_CONTACT.email} · ${shopAddress}
- Fitment: each product lists vehicle compatibility (make/model/years). Do not invent fitment beyond that table. Generation nicknames (Civic Reborn, Rebirth, Civic X, Corolla E140, etc.) are search aliases only.

## Key pages

- [Shop all](${site}/shop) · [Shop by vehicle](${site}/cars) · [Categories](${site}/categories) · [Cash on Delivery](${site}/cash-on-delivery) · [Shipping](${site}/shipping-policy) · [Returns](${site}/returns-policy) · [FAQ](${site}/faq) · [Contact](${site}/contact)

## Machine-readable data

- Product catalogue (JSON, fitment per product): ${site}/feed/ai-catalog.json
- Product feed (XML): ${site}/feed/products.xml
- AI discovery: ${site}/.well-known/ai.json
- Sitemap: ${site}/sitemap.xml
- This file: ${site}/llms.txt

`;

  let vehicleBlock = vehicleLinks.length ? vehicleLinks.join("\n") : `- [Shop by car](${site}/cars)`;
  let categoryBlock = categoryLinks.length ? categoryLinks.join("\n") : `- [Categories](${site}/categories)`;
  let productBlock = productLinks.length
    ? productLinks.join("\n")
    : `See ${site}/feed/ai-catalog.json for the full catalogue.`;

  const assemble = (v, c, p) =>
    `${preamble}## Shop by vehicle (popular generations)\n\n${v}\n\n## Categories\n\n${c}\n\n## Sample products\n\n${p}\n`;

  let body = assemble(vehicleBlock, categoryBlock, productBlock);

  // Trim carefully if over budget: drop sample products first, then trim vehicle aliases already short.
  if (Buffer.byteLength(body, "utf8") > MAX_BYTES && productLinks.length) {
    productBlock = productLinks.slice(0, 12).join("\n");
    body = assemble(vehicleBlock, categoryBlock, productBlock);
  }
  if (Buffer.byteLength(body, "utf8") > MAX_BYTES && vehicleLinks.length > 40) {
    vehicleBlock = vehicleLinks.slice(0, 40).join("\n");
    body = assemble(vehicleBlock, categoryBlock, productBlock);
  }
  if (Buffer.byteLength(body, "utf8") > MAX_BYTES && categoryLinks.length > 30) {
    categoryBlock = categoryLinks.slice(0, 30).join("\n");
    body = assemble(vehicleBlock, categoryBlock, productBlock);
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
