import { permanentRedirect } from "next/navigation";

/** Shopify /collections index → category browse. */
export default function CollectionsIndexRedirect() {
  permanentRedirect("/categories");
}
