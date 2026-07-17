import BlogListView from "@/components/store/BlogListView";
const BASE_URL = (process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://crazzycars.pk").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Blog | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} — car care tips & accessories Guides`,
  description:
    `Expert car accessories advice, aftercare guides, accessories care tips and style inspiration from ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} automotive specialists — read our blog.`,
  keywords:
    "car accessories pakistan, seat covers, steering wheels, floor mats, car lighting, auto accessories sialkot",
  alternates: {
    canonical: `${BASE_URL}/blogs`,
  },
  openGraph: {
    title: `Blog | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    description: "Expert car accessories advice and accessories guides",
    type: "website",
    url: `${BASE_URL}/blogs`,
  },
};

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
