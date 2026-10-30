import { headers } from "next/headers";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { getSiteUrl } from "@/lib/siteUrl";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";
import { productAllowsCod } from "@/lib/codEligibility";
import { productHasRealImage } from "@/lib/productImages";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Full llms.txt variant: same preamble as /llms.txt plus the complete product list
 * (active products with a real photo). Linked from /llms.txt.
 */
export async function GET() {
  const h = await headers();
  const site = getSiteUrl({ headers: h });

  // Reuse the short file as the preamble.
  const shortRes = await fetch(`${site}/llms.txt`, {
    headers: { Accept: "text/plain" },
    next: { revalidate: 3600 },
  }).catch(() => null);
  let preamble =
    shortRes && shortRes.ok
      ? await shortRes.text()
      : `# CrazzyCars.pk\n\nSee ${site}/llms.txt for store facts.\n`;

  // Point readers at this full file.
  if (!preamble.includes("llms-full.txt")) {
    preamble = preamble.replace(
      `This file: ${site}/llms.txt`,
      `This file: ${site}/llms.txt\n- Full product list: ${site}/llms-full.txt`
    );
  }

  let productLines = [];
  try {
    await dbConnect();
    const products = await Product.find(WEBSITE_PRODUCT_FILTER)
      .select(
        "name slug pricing.regularPrice pricing.salePrice codEnabled codEligible media images image"
      )
      .sort({ name: 1 })
      .lean();
    productLines = (products || [])
      .filter((p) => p?.slug && productHasRealImage(p))
      .map((p) => {
        const sale = Number(p.pricing?.salePrice);
        const regular = Number(p.pricing?.regularPrice);
        const price =
          Number.isFinite(sale) && sale > 0 && (!Number.isFinite(regular) || sale < regular)
            ? sale
            : Number.isFinite(regular)
              ? regular
              : null;
        const priceBit =
          price != null ? ` — PKR ${Math.round(price).toLocaleString("en-PK")}` : "";
        const cod = productAllowsCod(p) ? "COD eligible" : "prepaid";
        return `- [${p.name}](${site}/${p.slug})${priceBit} · ${cod}`;
      });
  } catch (err) {
    console.error("[llms-full.txt]", err?.message || err);
  }

  const body = `${preamble.trim()}\n\n## Full product list (${productLines.length})\n\n${
    productLines.length ? productLines.join("\n") : `See ${site}/feed/ai-catalog.json`
  }\n`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
