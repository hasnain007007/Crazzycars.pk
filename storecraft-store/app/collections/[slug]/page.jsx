import { permanentRedirect } from "next/navigation";
import { resolveCollectionHandleToPath } from "@/lib/resolveCollectionHandle";

export const dynamic = "force-dynamic";

/**
 * Shopify-era collection URLs indexed by Google (/collections/:handle).
 * Resolve to /categories/:slug or /cars/:slug and 308 permanently.
 */
export default async function LegacyCollectionRedirect({ params }) {
  const { slug } = await params;
  const dest = await resolveCollectionHandleToPath(slug);
  permanentRedirect(dest);
}
