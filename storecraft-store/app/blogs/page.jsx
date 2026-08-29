import BlogListView from "@/components/store/BlogListView";
import { dbConnect } from "@/lib/db";
import { loadBlogIndexBootstrap } from "@/lib/storeBlogData";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { ROBOTS_INDEX_FOLLOW, ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";
import { withSafeMetadata } from "@/lib/safeMetadata";

export const dynamic = "force-dynamic";

export const generateMetadata = withSafeMetadata(async function blogsMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const base = buildPageMetadata({
    title: "Car Accessories Blog | Guides & Tips | CrazzyCars.pk",
    description:
      "Expert car accessories guides, fitment tips and aftercare advice from CrazzyCars.pk — body kits, LED lights, carbon fiber and more for Pakistan.",
    path: "/blogs",
    absoluteTitle: true,
    noIndex: page > 1,
  });
  return {
    ...base,
    robots: page > 1 ? ROBOTS_NOINDEX_FOLLOW : ROBOTS_INDEX_FOLLOW,
  };
});

export default async function BlogPage({ searchParams }) {
  const params = await searchParams;
  const page = parseInt(params?.page, 10) || 1;
  const limit = 12;
  let initial = null;
  try {
    await dbConnect();
    initial = await loadBlogIndexBootstrap({ page, limit });
  } catch (err) {
    console.error("[blogs] SSR load failed:", err?.message || err);
  }

  const categorySet = new Set();
  for (const post of initial?.allPosts || []) {
    for (const c of post.categories || []) {
      if (typeof c === "string" && c.trim()) categorySet.add(c.trim());
    }
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <BlogListView
        page={page}
        limit={limit}
        initialPosts={initial?.posts || []}
        initialRecent={initial?.recent || []}
        initialTotal={initial?.total || 0}
        initialTotalPages={initial?.pages || 1}
        initialCategories={[...categorySet]}
      />
    </div>
  );
}
