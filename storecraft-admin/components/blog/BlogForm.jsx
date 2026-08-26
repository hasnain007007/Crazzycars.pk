"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { SeoField } from "@/components/ui/SeoField";
import { SeoPreview } from "@/components/ui/SeoPreview";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { TagInput } from "@/components/ui/TagInput";
import { slugify } from "@/lib/slugify";

export function BlogForm({ postId }) {
  const router = useRouter();
  const isEdit = Boolean(postId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [slugWarning, setSlugWarning] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState({ url: "", publicId: "" });
  const [status, setStatus] = useState("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [categories, setCategories] = useState([]);
  const [authorName, setAuthorName] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    const res = await fetch(`/api/blog/${postId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error("Not found");
      return;
    }
    const p = json.post;
    setTitle(p.title || "");
    setSlug(p.slug || "");
    setSlugManual(true);
    setContent(p.content || "");
    setFeaturedImage(p.featuredImage || { url: "", publicId: "" });
    setStatus(p.status || "draft");
    setPublishedAt(p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 16) : "");
    setCategories(p.categories || []);
    setAuthorName(p.authorName || "");
    setMetaTitle(p.seo?.metaTitle || "");
    setMetaDescription(p.seo?.metaDescription || "");
    setMetaKeywords(Array.isArray(p.seo?.metaKeywords) ? p.seo.metaKeywords : []);
  }, [postId]);

  useEffect(() => {
    if (postId) load();
  }, [postId, load]);

  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  const checkSlugAvailability = useCallback(async () => {
    const raw = String(slug || slugify(title)).trim();
    if (!raw) return;
    try {
      const params = new URLSearchParams({ slug: raw });
      if (postId) params.set("excludeId", String(postId));
      const res = await fetch(`/api/blog/check-slug?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) return;
      if (json.available) {
        setSlugWarning("");
      } else if (json.suggestion && json.suggestion !== raw) {
        setSlug(json.suggestion);
        setSlugWarning(`⚠ Slug already in use, will be saved as: ${json.suggestion}`);
      }
    } catch {
      /* noop */
    }
  }, [postId, slug, title]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title,
        slug: slug || slugify(title),
        content,
        featuredImage,
        status,
        publishedAt: publishedAt || null,
        categories,
        authorName: authorName || "Admin",
        seo: { metaTitle, metaDescription, metaKeywords },
      };
      const url = isEdit ? `/api/blog/${postId}` : "/api/blog";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Saved");
      router.push("/blog-manager");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/blog-manager" className="text-sm text-[#1d6fb8] hover:underline">
        ← Blog
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit Blog" : "New Blog"}</h1>
      <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              onBlur={checkSlugAvailability}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            {slugWarning ? <p className="mt-1 text-xs font-medium text-amber-600">{slugWarning}</p> : null}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Content</label>
            <div className="mt-2 min-h-[280px] rounded-lg border border-slate-200 dark:border-slate-600">
              <RichTextEditor variant="full" content={content} onChange={setContent} placeholder="Write your blog…" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-600">Featured image</label>
            <div className="mt-2">
              <ImageUploader value={featuredImage} onChange={setFeaturedImage} uploadFolder="blog" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-600">Publish date</label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-600">Author display name</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-600">Categories</label>
            <TagInput value={categories} onChange={setCategories} placeholder="Add category, Enter" />
          </div>
          <details open={seoOpen} onToggle={(e) => setSeoOpen(e.target.open)} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">SEO</summary>
            <div className="mt-3 space-y-3">
              <SeoField type="title" label="Meta Title" value={metaTitle} onChange={setMetaTitle} />
              <SeoField type="description" label="Meta Description" value={metaDescription} onChange={setMetaDescription} />
              <SeoField type="keywords" label="Meta Keywords" keywordValue={metaKeywords} onKeywordChange={setMetaKeywords} />
              <SeoPreview title={metaTitle || title} description={metaDescription} slug={`blog/${slug}`} baseUrl="homefy.pk" />
            </div>
          </details>
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-[#1d6fb8] py-2 text-sm font-semibold text-white">
            {saving ? "Saving…" : "Save blog"}
          </button>
        </div>
      </form>
    </div>
  );
}
