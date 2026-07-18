import BlogListView from "@/components/store/BlogListView";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: `Blog | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} — car care tips & accessories Guides`,
  description:
    `Expert car accessories advice, aftercare guides, accessories care tips and style inspiration from ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} automotive specialists — read our blog.`,
  path: "/blogs",
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
