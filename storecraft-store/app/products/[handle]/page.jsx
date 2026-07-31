import { permanentRedirect } from "next/navigation";
import { canonicalProductPathForSlug } from "@/lib/resolveProductSlug";

/**
 * Shopify-era PDP route used by Meta carousel ads (`/products/[handle]`).
 * Resolve the handle to the canonical Mongo slug (incl. `-crazzycars-pk`
 * suffix migration) and 308 there so the customer lands on the real PDP.
 */
export default async function LegacyShopifyProductRedirect({ params }) {
  const { handle } = await params;
  const raw = String(handle || "").trim();
  if (!raw) permanentRedirect("/shop");

  const canonical = await canonicalProductPathForSlug(raw);
  if (canonical) permanentRedirect(canonical);

  // Last resort: still send to /[handle] so next.config / [slug] can try.
  permanentRedirect(`/${raw}`);
}
