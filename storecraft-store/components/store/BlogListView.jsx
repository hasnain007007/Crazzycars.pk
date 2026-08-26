"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function getDayMonth(value) {
  const d = new Date(value || Date.now());
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return { day, month };
}

function formatLongDate(value) {
  return new Date(value || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogListView({ page = 1, limit = 12 }) {
  const [posts, setPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          status: "published",
        });
        if (activeCategory !== "All") query.set("category", activeCategory);
        if (search.trim()) query.set("search", search.trim());
        const res = await fetch(`/api/posts?${query.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setPosts(data.posts || []);
          setRecentPosts(Array.isArray(data.recentPosts) ? data.recentPosts : []);
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(["All", ...data.categories]);
          } else {
            setCategories(["All"]);
          }
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setRecentPosts([]);
          setCategories(["All"]);
          setTotalPages(1);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, limit, page, search]);

  const categoryList = useMemo(() => {
    const dynamic = [...new Set((categories || []).filter(Boolean))];
    return dynamic.length ? dynamic : ["All"];
  }, [categories]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out = new Set([1, totalPages, page - 1, page, page + 1, page - 2, page + 2]);
    return [...out].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, total);

  return (
    <div className="store-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "34px 16px 70px", background: "#fff" }}>
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, color: "#777", margin: "0 0 10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <Link href="/" style={{ color: "#777", textDecoration: "none" }}>
            Home
          </Link>{" "}
          / <span>Blog</span>
        </p>
        <h1 style={{ margin: "0", fontSize: "clamp(34px, 5vw, 48px)", color: "#111", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Blog
        </h1>
      </div>

      <div
        className="blog-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div className="blog-main min-w-0">
          <div className="blog-toolbar" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end", marginBottom: 26 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {categoryList.length > 1
                ? categoryList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`blog-filter-link${activeCategory === cat ? " blog-filter-link-active" : ""}`}
                    >
                      {cat}
                    </button>
                  ))
                : null}
            </div>
            <input
              className="blog-toolbar-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts"
              style={{ width: 220, maxWidth: "100%", border: "1px solid #E5E5E5", padding: "9px 12px", fontSize: 12, outline: "none", background: "#fff" }}
            />
          </div>

          {loading ? (
            <div style={{ fontSize: 14, color: "#666", padding: "20px 0" }}>Loading posts...</div>
          ) : (
            <>
              <div className="blog-list-wrap">
                {posts.length === 0 ? (
                  <p style={{ fontSize: 15, color: "#666", padding: "24px 0" }}>No posts found.</p>
                ) : null}
                {posts.map((post) => {
                  const date = getDayMonth(post.publishedAt || post.createdAt);
                  return (
                    <article key={post._id || post.id || post.slug} className="blog-list-item">
                      <div className="blog-list-left">
                        <span className="blog-date-badge">
                          <span>{date.day}</span>
                          <span>{date.month}</span>
                        </span>
                        <Link href={`/blogs/${post.slug}`} className="blog-list-image-link">
                          {post.featuredImage?.url ? (
                            <img
                              src={post.featuredImage.url}
                              alt={post.featuredImage?.altText || post.title}
                              className="blog-list-image"
                            />
                          ) : (
                            <div className="blog-list-image blog-list-image-empty" />
                          )}
                        </Link>
                      </div>

                      <div className="blog-list-content">
                        <h2 className="blog-list-title">
                          <Link href={`/blogs/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p className="blog-list-excerpt">
                          {String(post.excerpt || "").slice(0, 190)}
                          {String(post.excerpt || "").length > 190 ? "..." : ""}
                        </p>
                        <p className="blog-list-meta">
                          {post.author?.name || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'}`} · {formatLongDate(post.publishedAt || post.createdAt)} · {post.readTime || 3}{" "}
                          min read
                        </p>
                        <Link href={`/blogs/${post.slug}`} className="blog-read-more">
                          Read More
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div style={{ marginTop: 24, fontSize: 13, color: "#666" }}>
                Showing {showingFrom}-{showingTo} of {total} posts
              </div>
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {page > 1 ? (
                  <Link href={`/blogs?page=${page - 1}`} style={{ color: "#D72323", textDecoration: "none", fontSize: 14 }}>
                    Prev
                  </Link>
                ) : null}
                {pageNumbers.map((n) => (
                  <Link
                    key={n}
                    href={n === 1 ? "/blogs" : `/blogs?page=${n}`}
                    style={{
                      minWidth: 34,
                      height: 34,
                      border: n === page ? "1px solid #111111" : "1px solid #DDDDDD",
                      background: n === page ? "#111111" : "#FFFFFF",
                      color: n === page ? "#FFFFFF" : "#555555",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    {n}
                  </Link>
                ))}
                {page < totalPages ? (
                  <Link href={`/blogs?page=${page + 1}`} style={{ color: "#D72323", textDecoration: "none", fontSize: 14 }}>
                    Next
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </div>

        <aside className="blog-sidebar" style={{ border: "1px solid #E5E5E5", padding: 16, background: "#FAFAFA" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#111", textTransform: "uppercase" }}>Recent Posts</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {(recentPosts.length ? recentPosts : posts.slice(0, 5)).map((p) => (
              <li key={p._id || p.slug} style={{ borderBottom: "1px solid #EEEEEE", padding: "10px 0" }}>
                <Link href={`/blogs/${p.slug}`} style={{ fontSize: 13, color: "#333333", fontWeight: 600, textDecoration: "none", lineHeight: 1.35 }}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
