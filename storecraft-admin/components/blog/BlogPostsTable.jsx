"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function tokenHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function BlogPostsTable() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "10", status });
      if (search.trim()) qs.set("search", search.trim());
      if (category !== "all") qs.set("category", category);
      const res = await fetch(`/api/blog?${qs.toString()}`, { headers: tokenHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load blogs");
      setPosts(json.posts || []);
      setTotal(Number(json.total || 0));
      setPages(Math.max(1, Number(json.pages || 1)));
    } catch (e) {
      toast.error(e.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, status, category]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => (p.categories || []).forEach((c) => set.add(c)));
    return ["all", ...Array.from(set)];
  }, [posts]);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === "published").length;
    const draft = posts.filter((p) => p.status === "draft").length;
    const featured = posts.filter((p) => p.isFeatured).length;
    return { published, draft, featured };
  }, [posts]);

  const onDelete = async (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      const res = await fetch(`/api/blog/${post._id}`, { method: "DELETE", headers: tokenHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Blog deleted");
      load();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  const togglePublish = async (post) => {
    const nextStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/blog/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...tokenHeaders() },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
      toast.success(nextStatus === "published" ? "Blog published" : "Blog moved to draft");
      load();
    } catch (e) {
      toast.error(e.message || "Status update failed");
    }
  };

  const statusBadge = (s) => {
    if (s === "published") return { label: "Published", bg: "#dcfce7", color: "#166534" };
    if (s === "scheduled") return { label: "Scheduled", bg: "#dbeafe", color: "#1d4ed8" };
    return { label: "Draft", bg: "#e5e7eb", color: "#374151" };
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>Blogs</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Manage your blog content</p>
        </div>
        <Link href="/blog-manager/new">
          <button style={primaryBtn}>+ New Blog</button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
        <StatCard title="Total Blogs" value={total} />
        <StatCard title="Published" value={stats.published} valueColor="#16a34a" />
        <StatCard title="Draft" value={stats.draft} valueColor="#6b7280" />
        <StatCard title="Featured" value={stats.featured} valueColor="#f59e0b" />
      </div>

      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            style={{ ...input, maxWidth: 280 }}
          />
          <button style={outlineBtn} onClick={() => { setPage(1); load(); }}>Search</button>

          <div style={{ display: "flex", gap: 8 }}>
            {["all", "published", "draft", "scheduled"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                style={{
                  ...outlineBtn,
                  background: status === s ? "#eff6ff" : "#fff",
                  color: status === s ? "#1d4ed8" : "#374151",
                }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...input, width: 180, marginLeft: "auto" }}>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading blogs...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>No blogs found.</p>
            <Link href="/blog-manager/new">
              <button style={{ ...primaryBtn, marginTop: 12 }}>Create first blog</button>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Image", "Title", "Author", "Category", "Status", "Date", "Views", "Read Time", "Actions"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const badge = statusBadge(post.status);
                  return (
                    <tr key={post._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={td}>
                        {post.featuredImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.featuredImage.url} alt={post.featuredImage.altText || post.title} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 60, height: 60, borderRadius: 8, background: "#f3f4f6", display: "grid", placeItems: "center" }}>📝</div>
                        )}
                      </td>
                      <td style={td}>
                        <Link href={`/blog-manager/${post._id}`} style={{ color: "#111827", fontWeight: 700 }}>
                          {post.title}
                        </Link>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                          {String(post.excerpt || "").slice(0, 80)}
                        </p>
                      </td>
                      <td style={td}>{post.author?.name || "—"}</td>
                      <td style={td}>{(post.categories || [])[0] || "—"}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: badge.bg, color: badge.color }}>{badge.label}</span></td>
                      <td style={td}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                      <td style={td}>👁 {post.views || 0}</td>
                      <td style={td}>{post.readTime || 1} min read</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link href={`/blog-manager/${post._id}`}><button style={outlineBtn}>Edit</button></Link>
                          <button style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fecaca" }} onClick={() => onDelete(post)}>Delete</button>
                          <button style={outlineBtn} onClick={() => togglePublish(post)}>
                            {post.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 ? (
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              style={{ ...outlineBtn, background: page === i + 1 ? "#009688" : "#fff", color: page === i + 1 ? "#fff" : "#374151", borderColor: page === i + 1 ? "#009688" : "#e5e7eb" }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 };
const input = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", fontSize: 14 };
const primaryBtn = { background: "#009688", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontWeight: 700 };
const outlineBtn = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", background: "#fff", cursor: "pointer", fontSize: 12 };
const th = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#374151", borderBottom: "1px solid #e5e7eb" };
const td = { padding: "10px 12px", fontSize: 14, color: "#374151", verticalAlign: "top" };

function StatCard({ title, value, valueColor = "#111827" }) {
  return (
    <div style={card}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{title}</p>
      <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: valueColor }}>{value}</p>
    </div>
  );
}
