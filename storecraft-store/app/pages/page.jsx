import { permanentRedirect } from "next/navigation";

/** Shopify /pages index — no listing on the new site. */
export default function PagesIndexRedirect() {
  permanentRedirect("/");
}
