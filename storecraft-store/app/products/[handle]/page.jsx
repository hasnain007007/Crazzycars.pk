import { permanentRedirect } from "next/navigation";

/**
 * Shopify-era PDP route. All catalogue / Meta carousel links that still use
 * /products/[handle] must land on the Mongo PDP at /[slug].
 */
export default async function LegacyShopifyProductRedirect({ params }) {
  const { handle } = await params;
  const slug = String(handle || "").trim();
  if (!slug) permanentRedirect("/shop");
  permanentRedirect(`/${slug}`);
}
