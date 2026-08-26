import BlogListView from "@/components/store/BlogListView";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { ROBOTS_INDEX_FOLLOW, ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const base = buildPageMetadata({
    title: "Homefy Blog | Kitchen, Beauty & Bags | Homefy.pk",
    description:
      "Guides and tips from Homefy.pk — kitchen accessories, beauty bags and ladies handbags for Pakistani homes.",
    path: "/blogs",
    absoluteTitle: true,
    noIndex: page > 1,
  });
  return {
    ...base,
    robots: page > 1 ? ROBOTS_NOINDEX_FOLLOW : ROBOTS_INDEX_FOLLOW,
  };
}

export default async function BlogPage({ searchParams }) {
  const params = await searchParams;
  const page = parseInt(params?.page, 10) || 1;
  const limit = 12;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <BlogListView page={page} limit={limit} />
    </div>
  );
}
