import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";
import PageView from "@/components/store/PageView";

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

  const BASE_URL = process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL;

  return {
    title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    description: page.seo?.metaDescription || ``,
    alternates: {
      canonical: page.seo?.canonical || `${BASE_URL}/${slug}`,
    },
    openGraph: {
      title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
      description: page.seo?.metaDescription || "",
      type: "website",
      url: page.seo?.canonical || `${BASE_URL}/${slug}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function PageSlugPage({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();
  return <PageView page={page} />;
}
