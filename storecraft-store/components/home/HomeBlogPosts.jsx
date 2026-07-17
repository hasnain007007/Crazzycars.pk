"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomeBlogPosts() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("/api/posts?limit=3")
      .then((r) => r.json())
      .then((d) => {
        const list = d?.posts || d?.data || [];
        setPosts(Array.isArray(list) ? list.slice(0, 3) : []);
      })
      .catch(() => setPosts([]));
  }, []);

  if (!posts.length) return null;

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-heading text-2xl font-bold text-[#1A1A1A]">From the Blog</h2>
          <Link href="/blogs" className="text-sm font-bold text-[#D72323]">
            View All →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug || post.id}
              href={post.slug ? `/blogs/${post.slug}` : "/blogs"}
              className="overflow-hidden rounded-xl border border-[#E5E5E5] transition hover:border-[#D72323] hover:shadow-md"
            >
              <div
                className="aspect-[16/9] w-full"
                style={{ background: "linear-gradient(135deg, #1A1A1A, #2D0000)" }}
              />
              <div className="p-4">
                <h3 className="line-clamp-2 font-bold text-[#1A1A1A]">{post.title}</h3>
                {post.excerpt ? <p className="mt-2 line-clamp-2 text-xs text-[#666]">{post.excerpt}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
