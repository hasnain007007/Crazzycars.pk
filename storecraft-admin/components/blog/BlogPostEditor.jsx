"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";

const TinyEditor = dynamic(() => import("@/components/ui/TinyEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 600,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#9ca3af",
      }}
    >
      Loading editor...
    </div>
  ),
});
import { SeoField } from "@/components/ui/SeoField";
import { SeoPreview } from "@/components/ui/SeoPreview";
import { TagInput } from "@/components/ui/TagInput";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function tokenHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function BlogPostEditor({ postId = null }) {
  const router = useRouter();
  const isEdit = Boolean(postId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [slugEditOpen, setSlugEditOpen] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: { url: "", publicId: "", altText: "" },
    author: { name: "", avatar: "", bio: "" },
    categories: [],
    tags: [],
    status: "draft",
    publishedAt: "",
    scheduledAt: "",
    views: 0,
    readTime: 1,
    seo: { metaTitle: "", metaDescription: "", metaKeywords: [] },
    allowComments: true,
    isFeatured: false,
    sortOrder: 0,
    relatedProducts: [],
  });

  useEffect(() => {
    if (slugEdited) return;
    setForm((f) => ({ ...f, slug: slugify(f.title) }));
  }, [form.title, slugEdited]);

  const wordCount = useMemo(
    () => String(form.content || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
    [form.content]
  );
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  useEffect(() => {
    (async () => {
      try {
        const productsRes = await fetch("/api/products?limit=200", { headers: tokenHeaders() });
        const productsJson = await productsRes.json();
        setAllProducts(productsJson.data || productsJson.products || []);

        if (isEdit) {
          const res = await fetch(`/api/blog/${postId}`, { headers: tokenHeaders() });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.error || "Failed to load blog");
          const p = json.post;
          setForm({
            title: p.title || "",
            slug: p.slug || "",
            excerpt: p.excerpt || "",
            content: p.content || "",
            featuredImage: {
              url: p.featuredImage?.url || "",
              publicId: p.featuredImage?.publicId || "",
              altText: p.featuredImage?.altText || "",
            },
            author: {
              name: p.author?.name || "",
              avatar: p.author?.avatar || "",
              bio: p.author?.bio || "",
            },
            categories: p.categories || [],
            tags: p.tags || [],
            status: p.status || "draft",
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 16) : "",
            scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : "",
            views: Number(p.views || 0),
            readTime: Number(p.readTime || 1),
            seo: {
              metaTitle: p.seo?.metaTitle || "",
              metaDescription: p.seo?.metaDescription || "",
              metaKeywords: Array.isArray(p.seo?.metaKeywords)
                ? p.seo.metaKeywords
                : typeof p.seo?.metaKeywords === "string"
                  ? p.seo.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean)
                  : [],
            },
            allowComments: p.allowComments !== false,
            isFeatured: Boolean(p.isFeatured),
            sortOrder: Number(p.sortOrder || 0),
            relatedProducts: (p.relatedProducts || []).map((rp) => rp._id || rp),
          });
          setSlugEdited(true);
        }
      } catch (e) {
        toast.error(e.message || "Failed to initialize editor");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, postId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!form.title.trim()) return;
      try {
        const payload = buildPayload(form, readTime, true);
        if (isEdit) {
          await fetch(`/api/blog/${postId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...tokenHeaders() },
            body: JSON.stringify({ ...payload, status: "draft" }),
          });
        }
      } catch {
        // silent autosave
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [form, readTime, isEdit, postId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProducts.slice(0, 30);
    return allProducts.filter((p) => String(p.name || "").toLowerCase().includes(q)).slice(0, 30);
  }, [allProducts, productSearch]);

  const save = async (nextStatus = form.status) => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload({ ...form, status: nextStatus }, readTime, false);
      const res = await fetch(isEdit ? `/api/blog/${postId}` : "/api/blog", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success(isEdit ? "Blog updated" : "Blog created");
      router.push("/blog-manager");
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!window.confirm("Delete this blog?")) return;
    try {
      const res = await fetch(`/api/blog/${postId}`, { method: "DELETE", headers: tokenHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Blog deleted");
      router.push("/blog-manager");
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#9ca3af" }}>Loading blog editor...</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 340px", gap: 16 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={card}>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Enter your blog title..."
            style={{ ...input, fontSize: 20, fontWeight: 700 }}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
            <span>/posts/{form.slug || "your-slug"}</span>
            <button type="button" onClick={() => setSlugEditOpen((s) => !s)} style={tinyBtn}>✏️</button>
          </div>
          {slugEditOpen ? (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                style={input}
              />
              <button type="button" onClick={() => setSlugEditOpen(false)} style={tinyBtn}>Save</button>
              <button type="button" onClick={() => { setSlugEditOpen(false); setSlugEdited(false); }} style={tinyBtn}>Cancel</button>
            </div>
          ) : null}
        </div>

        <div style={card}>
          <TinyEditor
            value={form.content || form.body || ""}
            onChange={(val) => setForm((f) => ({ ...f, content: val, body: val }))}
            height={600}
            placeholder="Write your blog post..."
          />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b7280" }}>{wordCount} words · {readTime} min read</p>
        </div>

        <div style={card}>
          <h3 style={h3}>Featured Image</h3>
          <ImageUploader
            value={form.featuredImage?.url ? form.featuredImage : null}
            onChange={(img) => setForm((f) => ({ ...f, featuredImage: img || { url: "", publicId: "", altText: "" } }))}
            multiple={false}
            uploadFolder="blog"
          />
          {form.featuredImage?.url ? (
            <div style={{ marginTop: 10 }}>
              <label style={label}>Alt text</label>
              <input
                value={form.featuredImage.altText || ""}
                onChange={(e) => setForm((f) => ({ ...f, featuredImage: { ...f.featuredImage, altText: e.target.value } }))}
                style={input}
              />
            </div>
          ) : null}
        </div>

        <div style={card}>
          <h3 style={h3}>Excerpt / Summary</h3>
          <textarea
            rows={3}
            value={form.excerpt}
            maxLength={300}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            style={input}
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>{form.excerpt.length}/300 chars</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>Shown in blog listings and social shares</p>
        </div>

        <div style={card}>
          <h3 style={h3}>SEO</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <SeoField
              type="title"
              label="Meta Title"
              value={form.seo.metaTitle}
              onChange={(v) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle: v } }))}
            />
            <SeoField
              type="description"
              label="Meta Description"
              value={form.seo.metaDescription}
              onChange={(v) => setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription: v } }))}
            />

            {/* Keywords / Tags */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Keywords / Tags
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(press Enter to add)</span>
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "#fff",
                  minHeight: 42,
                  cursor: "text",
                }}
                onClick={() => document.getElementById("seo-keyword-input")?.focus()}
              >
                {(form.seo.metaKeywords || []).map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: 99,
                      fontSize: 12,
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((f) => ({
                          ...f,
                          seo: { ...f.seo, metaKeywords: (f.seo.metaKeywords || []).filter((_, idx) => idx !== i) },
                        }));
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="seo-keyword-input"
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = keywordInput.trim();
                      if (!val) return;
                      const current = form.seo.metaKeywords || [];
                      if (current.includes(val)) {
                        setKeywordInput("");
                        return;
                      }
                      setForm((f) => ({ ...f, seo: { ...f.seo, metaKeywords: [...(f.seo.metaKeywords || []), val] } }));
                      setKeywordInput("");
                    }
                    if (e.key === "Backspace" && !keywordInput) {
                      const current = form.seo.metaKeywords || [];
                      if (current.length > 0) {
                        setForm((f) => ({ ...f, seo: { ...f.seo, metaKeywords: (f.seo.metaKeywords || []).slice(0, -1) } }));
                      }
                    }
                  }}
                  placeholder={(form.seo.metaKeywords || []).length === 0 ? "Type keyword and press Enter..." : "Add more..."}
                  style={{ border: "none", outline: "none", fontSize: 13, color: "#111827", background: "transparent", minWidth: 120, flex: 1 }}
                />
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                Type a keyword and press Enter to add. Click × to remove. Backspace removes last keyword.
              </p>
            </div>

            <SeoPreview title={form.seo.metaTitle || form.title} description={form.seo.metaDescription} slug={`posts/${form.slug || "your-slug"}`} />
          </div>
        </div>
      </div>

      <div style={{ position: "sticky", top: 20, alignSelf: "start", display: "grid", gap: 12 }}>
        <div style={card}>
          <h3 style={h3}>Publish Settings</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {["draft", "published", "scheduled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                style={{ ...tinyBtn, background: form.status === s ? "#eff6ff" : "#fff", color: form.status === s ? "#1d4ed8" : "#374151" }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {form.status === "scheduled" ? (
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} style={{ ...input, marginTop: 10 }} />
          ) : null}
          <button type="button" style={{ ...primaryBtn, width: "100%", marginTop: 10 }} onClick={() => save()}>
            {saving ? "Saving..." : isEdit ? "Update Blog" : "Publish Blog"}
          </button>
          <button type="button" style={{ marginTop: 8, background: "none", border: "none", color: "#6b7280", cursor: "pointer" }} onClick={() => save("draft")}>
            Save as Draft
          </button>
          {isEdit ? (
            <button type="button" style={{ ...outlineBtn, width: "100%", color: "#dc2626", borderColor: "#fecaca", marginTop: 8 }} onClick={remove}>
              Delete
            </button>
          ) : null}
        </div>

        <div style={card}>
          <h3 style={h3}>Author</h3>
          <label style={label}>Author Name</label>
          <input value={form.author.name} onChange={(e) => setForm((f) => ({ ...f, author: { ...f.author, name: e.target.value } }))} style={input} />
          <label style={{ ...label, marginTop: 8 }}>Author Bio</label>
          <textarea rows={2} value={form.author.bio} onChange={(e) => setForm((f) => ({ ...f, author: { ...f.author, bio: e.target.value } }))} style={input} />
        </div>

        <div style={card}>
          <h3 style={h3}>Categories & Tags</h3>
          <label style={label}>Categories</label>
          <TagInput value={form.categories} onChange={(v) => setForm((f) => ({ ...f, categories: v }))} placeholder="Add category and press Enter" />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>Suggestions: Jewelry Care, Piercing Tips, Style Guide, New Arrivals, How To</p>
          <label style={{ ...label, marginTop: 8 }}>Tags / Keywords</label>
          <TagInput value={form.tags} onChange={(v) => setForm((f) => ({ ...f, tags: v }))} placeholder="Add tag and press Enter" />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>
            Separate keywords to improve SEO and blog filtering.
          </p>
        </div>

        <div style={card}>
          <h3 style={h3}>Settings</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
            Featured Blog
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={form.allowComments} onChange={(e) => setForm((f) => ({ ...f, allowComments: e.target.checked }))} />
            Allow Comments
          </label>
          <label style={{ ...label, marginTop: 8 }}>Sort Order</label>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} style={input} />
        </div>

        <div style={card}>
          <h3 style={h3}>Related Products (max 3)</h3>
          <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} style={input} placeholder="Search products..." />
          <div style={{ marginTop: 8, maxHeight: 220, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            {filteredProducts.map((p) => {
              const checked = form.relatedProducts.includes(p._id);
              return (
                <label key={p._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setForm((f) => {
                        const next = checked
                          ? f.relatedProducts.filter((id) => id !== p._id)
                          : f.relatedProducts.length >= 3
                            ? f.relatedProducts
                            : [...f.relatedProducts, p._id];
                        return { ...f, relatedProducts: next };
                      })
                    }
                  />
                  <span style={{ fontSize: 13 }}>{p.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildPayload(form, readTime, draftAutosave) {
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    featuredImage: form.featuredImage,
    author: form.author,
    categories: form.categories,
    tags: form.tags,
    status: draftAutosave ? "draft" : form.status,
    publishedAt: form.publishedAt || null,
    scheduledAt: form.scheduledAt || null,
    views: form.views || 0,
    readTime,
    seo: form.seo,
    allowComments: form.allowComments,
    isFeatured: form.isFeatured,
    sortOrder: form.sortOrder || 0,
    relatedProducts: form.relatedProducts,
  };
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 };
const input = { width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", fontSize: 14 };
const primaryBtn = { background: "#009688", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const outlineBtn = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" };
const tinyBtn = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "5px 8px", fontSize: 12, cursor: "pointer" };
const label = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" };
const h3 = { margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#111827" };
