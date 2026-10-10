import { permanentRedirect } from "next/navigation";

/** Shopify /collections index → shop (all products). */
export default function CollectionsIndexRedirect() {
  permanentRedirect("/shop");
}
