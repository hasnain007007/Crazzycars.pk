"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import BlogPostEditor from "@/components/blog/BlogPostEditor";
import { NeighborNav } from "@/components/layout/NeighborNav";
import { useEntityNeighbors } from "@/lib/useEntityNeighbors";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  const neighbors = useEntityNeighbors(/^[a-f\d]{24}$/i.test(id) ? id : null, "/api/blog");
  if (!/^[a-f\d]{24}$/i.test(id)) return <p className="text-sm text-red-600">Invalid id</p>;
  return (
    <div style={{ padding: 24 }} key={id}>
      <div
        style={{
          marginBottom: 14,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Blog Manager / Edit Blog</p>
          <Link href="/blog-manager" style={{ color: "#009688", fontSize: 13 }}>
            ← Back
          </Link>
        </div>
        <NeighborNav
          prev={neighbors.prev}
          next={neighbors.next}
          hrefForId={(nid) => `/blog-manager/${nid}`}
        />
      </div>
      <BlogPostEditor key={id} postId={id} />
    </div>
  );
}
