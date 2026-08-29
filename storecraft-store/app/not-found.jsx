import { cookies, headers } from "next/headers";
import { ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";
import { MissingProductView } from "@/components/store/MissingProductView";
import { logPaidMissingPage, PAID_TRAFFIC_COOKIE } from "@/lib/paidTraffic";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { findUnavailableProductBySlugParam } from "@/lib/resolveProductSlug";
import {
  looksLikeProductSlug,
  slugFromPathname,
  suggestProductsForMissingSlug,
  loadSimilarActiveProducts,
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
  let unavailableName = "";

  if (looksLikeProductSlug(slug)) {
    try {
      const gone = await findUnavailableProductBySlugParam(slug);
      if (gone?._id) {
        await dbConnect();
        const full = await Product.findOne({ _id: gone._id, status: "inactive" })
          .select("name slug categories")
          .populate("categories", "name slug")
          .lean();
        unavailableName = String(full?.name || gone.name || "").trim();
        if (full) {
          suggestions = await loadSimilarActiveProducts(full, { limit: 6 });
        }
      }
    } catch (err) {
      console.error("[not-found] unavailable lookup:", err?.message || err);
    }
    if (!suggestions.length) {
      suggestions = await suggestProductsForMissingSlug(slug);
    }
  }

  return (
    <MissingProductView
      kind={unavailableName ? "unavailable" : "missing"}
      productName={unavailableName || undefined}
      suggestions={suggestions}
    />
  );
}
