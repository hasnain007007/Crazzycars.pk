"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import BlogPostEditor from "@/components/blog/BlogPostEditor";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  if (!/^[a-f\d]{24}$/i.test(id)) return <p className="text-sm text-red-600">Invalid id</p>;
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Blog Manager / Edit Blog</p>
        <Link href="/blog-manager" style={{ color: "#009688", fontSize: 13 }}>
          ← Back
        </Link>
      </div>
      <BlogPostEditor postId={id} />
    </div>
  );
}
