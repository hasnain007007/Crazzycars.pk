import { cookies, headers } from "next/headers";
import { ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";
import { MissingProductView } from "@/components/store/MissingProductView";
import { logPaidMissingPage, PAID_TRAFFIC_COOKIE } from "@/lib/paidTraffic";
import {
  looksLikeProductSlug,
  slugFromPathname,
  suggestProductsForMissingSlug,
} from "@/lib/suggestMissingProduct";

export const metadata = {
  title: "Page not found",
  description: "This page does not exist on CrazzyCars.pk.",
  robots: ROBOTS_NOINDEX_FOLLOW,
  alternates: { canonical: null },
};

export default async function NotFound() {
  const h = await headers();
  const cookieStore = await cookies();
  const pathname =
    h.get("x-cc-pathname") || cookieStore.get("cc_path")?.value || "";
  const source =
    h.get("x-cc-paid") || cookieStore.get(PAID_TRAFFIC_COOKIE)?.value || "";
  const referer = h.get("x-cc-referer") || h.get("referer") || "";

  if (source) {
    logPaidMissingPage({
      path: pathname || "(unknown)",
      kind: "404",
      source,
      referer,
    });
  }

  const slug = slugFromPathname(pathname);
  let suggestions = [];
  if (looksLikeProductSlug(slug)) {
    suggestions = await suggestProductsForMissingSlug(slug);
  }

  return <MissingProductView kind="missing" suggestions={suggestions} />;
}
