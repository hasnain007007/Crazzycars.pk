"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SeoField } from "@/components/ui/SeoField";
import { SeoPreview } from "@/components/ui/SeoPreview";
import { getStorefrontPageUrl } from "@/lib/storefrontUrl";
import { slugify } from "@/lib/slugify";

const EMPTY_FORM = {
  title: "",
  slug: "",
  content: "",
  status: "draft",
  showInFooter: false,
  seo: { metaTitle: "", metaDescription: "", metaKeywords: [] },
};

export function PageForm({ pageId }) {
  const router = useRouter();
  const isEdit = Boolean(pageId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugManual, setSlugManual] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(
    () => getStorefrontPageUrl(form.slug || "page-slug"),
    [form.slug]
  );

  const load = useCallback(async () => {
    if (!pageId) return;
    const res = await fetch(`/api/pages-manager/${pageId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error || "Not found.");
      return;
    }
    const p = json.page;
    setForm({
      title: p.title || "",
      slug: p.slug || "",
      content: p.content || "",
      status: p.status || "draft",
      showInFooter: Boolean(p.showInFooter),
      seo: {
        metaTitle: p.seo?.metaTitle || "",
        metaDescription: p.seo?.metaDescription || "",
        metaKeywords: Array.isArray(p.seo?.metaKeywords) ? p.seo.metaKeywords : [],
      },
    });
    setSlugManual(true);
  }, [pageId]);

  useEffect(() => {
    if (pageId) load();
  }, [pageId, load]);

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugManual]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        content: form.content,
        status: form.status,
        showInFooter: Boolean(form.showInFooter),
        seo: {
          metaTitle: form.seo.metaTitle,
          metaDescription: form.seo.metaDescription,
          metaKeywords: form.seo.metaKeywords,
        },
      };
      const url = isEdit ? `/api/pages-manager/${pageId}` : "/api/pages-manager";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed.");
        return;
      }
      toast.success("Saved.");
      router.push("/pages-manager");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/pages-manager" className="text-sm text-[#1d6fb8] hover:underline">
        ← Pages
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit page" : "New page"}</h1>
      <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Slug (auto)</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <p className="mt-1 text-xs text-slate-500">Live at: /pages/{form.slug || "page-slug"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Content</label>
            <div className="mt-2 min-h-[280px] rounded-lg border border-slate-200 dark:border-slate-600">
              <RichTextEditor
                variant="full"
                content={form.content}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
                placeholder="Page content…"
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-200 transition has-[:checked]:bg-emerald-500 dark:bg-slate-600">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.status === "published"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.checked ? "published" : "draft" }))
                  }
                />
                <span className="ml-1 inline-block h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {form.status === "published" ? "Published" : "Draft"}
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 0",
                borderBottom: "1px solid #f3f4f6",
                marginBottom: 16,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
                  Show in Footer
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Display this page link in the footer
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    showInFooter: !f.showInFooter,
                  }))
                }
                aria-pressed={form.showInFooter}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 99,
                  border: "none",
                  background: form.showInFooter ? "#009688" : "#d1d5db",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: form.showInFooter ? 22 : 2,
                    width: 20,
                    height: 20,
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            {form.status === "published" && form.slug ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Preview
              </a>
            ) : (
              <p className="text-xs text-slate-500">Publish the page to preview on the store.</p>
            )}
          </div>

          <details
            open={seoOpen}
            onToggle={(e) => setSeoOpen(e.target.open)}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">SEO</summary>
            <div className="mt-3 space-y-3">
              <SeoField
                type="title"
                label="Meta Title"
                value={form.seo.metaTitle}
                onChange={(metaTitle) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle } }))}
              />
              <SeoField
                type="description"
                label="Meta Description"
                value={form.seo.metaDescription}
                onChange={(metaDescription) =>
                  setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription } }))
                }
              />
              <SeoField
                type="keywords"
                label="Meta Keywords"
                keywordValue={form.seo.metaKeywords}
                onKeywordChange={(metaKeywords) =>
                  setForm((f) => ({ ...f, seo: { ...f.seo, metaKeywords } }))
                }
              />
              <SeoPreview
                title={form.seo.metaTitle || form.title}
                description={form.seo.metaDescription}
                slug={form.slug}
                baseUrl="crazzycars.pk"
              />
            </div>
          </details>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </form>
    </div>
  );
}
