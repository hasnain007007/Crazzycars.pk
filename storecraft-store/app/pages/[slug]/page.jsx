import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";
import PageView from "@/components/store/PageView";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";

const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";

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

export async function generateMetadata({ params }) {
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
}

export const dynamic = "force-dynamic";

export default async function PageSlugPage({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();
  return <PageView page={page} />;
}
