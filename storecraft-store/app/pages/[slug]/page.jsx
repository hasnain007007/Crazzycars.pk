import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";
import { DetailNeighborNav } from "@/components/store/DetailNeighborNav";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { loadCmsPageNeighbors } from "@/lib/storeNeighborLoaders";
import { sanitizePageHtml } from "@/lib/sanitizeHtml";

const PageView = dynamic(() => import("@/components/store/PageView"), { ssr: true });

const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";

async function loadPage(slug) {
  try {
    await dbConnect();
    const page = await Page.findOne({
      slug: String(slug),
      status: "published",
    }).lean();
    return page ? JSON.parse(JSON.stringify(page)) : null;
  } catch {
    return null;
  }
}

export const generateMetadata = withSafeMetadata(async function cmsPageMetadata({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: "Page Not Found" };

  const BASE_URL = getSiteUrl();
  const titleMeta = buildBrandedAbsoluteTitle(
    (page.seo?.metaTitle || "").trim() || page.title,
    { brand: BRAND }
  );
  const title = titleMeta.absolute;
  const description = page.seo?.metaDescription || "";
  const canonical = `${BASE_URL}/pages/${slug}`;

  return {
    title: titleMeta,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
    twitter: { card: "summary_large_image", title, description },
  };
});

export const dynamic = "force-dynamic";

export default async function PageSlugPage({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();
  const neighbors = await loadCmsPageNeighbors(page, { hrefPrefix: "/pages" });
  const safePage = { ...page, content: sanitizePageHtml(page.content) };
  return (
    <>
      <PageView page={safePage} />
      <DetailNeighborNav {...neighbors} />
    </>
  );
}
