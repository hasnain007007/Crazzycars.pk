import BlogListView from "@/components/store/BlogListView";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: `Blog | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'} — kitchen, beauty bags & ladies bags`,
  description:
    `Tips for the home and everyday style from ${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'} — kitchen accessories, beauty bags and ladies handbags.`,
  path: "/posts",
  absoluteTitle: true,
});

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
