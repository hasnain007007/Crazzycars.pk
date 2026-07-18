import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";
import PageView from "@/components/store/PageView";
import { getSiteUrl } from "@/lib/siteUrl";

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
  const title = page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`;
  const description = page.seo?.metaDescription || "";
  const canonical = `${BASE_URL}/pages/${slug}`;

  return {
    title,
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
