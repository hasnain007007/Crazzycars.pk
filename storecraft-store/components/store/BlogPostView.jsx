"use client";

import Link from "next/link";
import { useState } from "react";

function rowId(p) {
  if (!p || typeof p !== "object") return "";
  return p.id != null ? String(p.id) : p._id != null ? String(p._id) : "";
}

export default function BlogPostView({ initialPost, initialRecent = [] }) {
  const [post] = useState(initialPost);
  const [recentPosts] = useState(initialRecent);

  if (!post) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <h2 style={{ color: "#111111", marginBottom: 16 }}>Blog not found</h2>
        <Link href="/blogs" style={{ color: "#D72323", fontWeight: 600 }}>
          Back to Blog
        </Link>
      </div>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div style={{ background: "#FFFFFF", color: "#111111" }}>
      <div
        style={{
          borderBottom: "1px solid #ededed",
          padding: "34px 20px 24px",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 18,
              fontSize: 13,
              color: "#888888",
              flexWrap: "wrap",
            }}
          >
            <Link href="/" style={{ color: "#D72323", textDecoration: "none" }}>
              Home
            </Link>
            <span style={{ color: "#CCCCCC" }}>/</span>
            <Link href="/blogs" style={{ color: "#D72323", textDecoration: "none" }}>
              Blog
            </Link>
            <span style={{ color: "#CCCCCC" }}>/</span>
            <span
              style={{
                color: "#888888",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {post.title}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 14px",
              lineHeight: 1.2,
              letterSpacing: "0.01em",
            }}
          >
            {post.title}
          </h1>

          {post.excerpt ? (
            <p
              style={{
                fontSize: 16,
                color: "#666",
                lineHeight: 1.7,
                margin: "0 0 18px",
              }}
            >
              {post.excerpt}
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 10,
              flexWrap: "wrap",
              fontSize: 13,
              color: "#666",
            }}
          >
            <span>{post.author?.name || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            <span>·</span>
            <span>{post.readTime || 3} min read</span>
            {post.categories?.[0] ? (
              <>
                <span>·</span>
                <span>{post.categories[0]}</span>
              </>
            ) : null}
          </div>
        </div>

        {post.featuredImage?.url ? (
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.altText || post.title}
              style={{ width: "100%", height: 480, objectFit: "cover", display: "block" }}
            />
          </div>
        ) : null}
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "44px 20px", background: "#FFFFFF", color: "#222", fontSize: 18, lineHeight: 1.9 }}>
        <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content || "" }} />

        {post.tags?.length > 0 ? (
          <div style={{ marginTop: 36, paddingTop: 22, borderTop: "1px solid #EDEDED", fontSize: 14, color: "#888" }}>
            <span style={{ fontWeight: 700, color: "#444" }}>Tags:</span>{" "}
            {post.tags.map((tag, idx) => (
              <span key={tag}>
                <Link href={`/blogs?search=${encodeURIComponent(tag)}`} style={{ color: "#888", textDecoration: "none" }}>
                  {tag}
                </Link>
                {idx < post.tags.length - 1 ? " | " : ""}
              </span>
            ))}
          </div>
        ) : null}

        {post.author?.name ? (
          <div
            style={{
              marginTop: 40,
              paddingTop: 24,
              borderTop: "1px solid #EDEDED",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: "#666",
                  fontWeight: 600,
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Written by
              </p>
              <p className="cinzel" style={{ fontSize: 17, fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>
                {post.author.name}
              </p>
              {post.author.bio ? (
                <p style={{ fontSize: 14, color: "#555555", lineHeight: 1.6, margin: 0 }}>{post.author.bio}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {recentPosts?.length > 0 ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 60px", borderTop: "1px solid #efefef" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111111", margin: 0 }}>More Blogs</h2>
            <Link href="/blogs" style={{ color: "#D72323", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              View all
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {recentPosts
              .filter((p) => rowId(p) !== rowId(post))
              .slice(0, 3)
              .map((p) => (
                <Link key={rowId(p) || p.slug} href={`/blogs/${p.slug}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 0,
                      overflow: "hidden",
                      border: "1px solid #E5E5E5",
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#111111";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#E5E5E5";
                    }}
                  >
                    <div
                      style={{
                        height: 180,
                        background: "#F8F8F8",
                        position: "relative",
                      }}
                    >
                      {p.featuredImage?.url ? (
                        <img
                          src={p.featuredImage.url}
                          alt={p.title}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 8px", lineHeight: 1.4 }}>
                        {p.title}
                      </h3>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#AAAAAA" }}>
                        <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                        <span>{p.readTime || 3} min read</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
