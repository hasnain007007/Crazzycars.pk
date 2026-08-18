import { permanentRedirect } from "next/navigation";
import { canonicalProductPathForSlug } from "@/lib/resolveProductSlug";

/**
 * Shopify-era PDP route used by Meta carousel ads (`/products/[handle]`).
 * Resolve the handle to the canonical Mongo slug (incl. `-crazzycars-pk`
 * suffix migration / shortened handles) and 308 there.
 * Unknown handles go to /shop so Google stops seeing soft/hard 404s.
 */
export default async function LegacyShopifyProductRedirect({ params }) {
  const { handle } = await params;
  const raw = String(handle || "").trim();
  if (!raw) permanentRedirect("/shop");

  const canonical = await canonicalProductPathForSlug(raw);
  if (canonical) permanentRedirect(canonical);

  permanentRedirect("/shop");
}
