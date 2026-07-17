import BlogPostsTable from "@/components/blog/BlogPostsTable";

export const metadata = {
  title: "Blog",
};

export default function Page() {
  return (
    <div style={{ padding: 24 }}>
      <BlogPostsTable />
    </div>
  );
}

