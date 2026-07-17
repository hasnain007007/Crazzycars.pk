import Link from "next/link";
import BlogPostEditor from "@/components/blog/BlogPostEditor";

export default function Page() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Blog Manager / New Blog</p>
        <Link href="/blog-manager" style={{ color: "#009688", fontSize: 13 }}>
          ← Back
        </Link>
      </div>
      <BlogPostEditor />
    </div>
  );
}
