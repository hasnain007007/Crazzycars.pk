"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { SeoField } from "@/components/ui/SeoField";
import { SeoPreview } from "@/components/ui/SeoPreview";
import { CategoryProductsTab } from "@/components/categories/CategoryProductsTab";

const TinyEditor = dynamic(() => import("@/components/ui/TinyEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 300,
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function CategoryEditor({ categoryId = null, initialParentId = "" }) {
  const router = useRouter();
  const isEdit = Boolean(categoryId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [allCategories, setAllCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: { url: "", publicId: "", altText: "", title: "" },
    parentCategory: "",
    status: "active",
    featured: false,
    showInNav: false,
    showInFooter: false,
    showOnHomepage: false,
    homepageOrder: 0,
    homepageIcon: "",
    sortOrder: 0,
    seo: { metaTitle: "", metaDescription: "", keywords: "" },
  });
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (slugEdited) return;
    setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, slugEdited]);

  const categoryMap = useMemo(
    () => new Map(allCategories.map((cat) => [String(cat._id), cat])),
    [allCategories]
  );

  const descendantIds = useMemo(() => {
    if (!isEdit || !categoryId) return new Set();
    const id = String(categoryId);
    const childrenByParent = {};
    allCategories.forEach((c) => {
      const p = c.parentCategory?._id ? String(c.parentCategory._id) : c.parentCategory ? String(c.parentCategory) : "";
      if (!p) return;
      if (!childrenByParent[p]) childrenByParent[p] = [];
      childrenByParent[p].push(String(c._id));
    });
    const set = new Set();
    const stack = [...(childrenByParent[id] || [])];
    while (stack.length) {
      const cur = stack.pop();
      if (set.has(cur)) continue;
      set.add(cur);
      stack.push(...(childrenByParent[cur] || []));
    }
    return set;
  }, [allCategories, categoryId, isEdit]);

  const parentOptions = useMemo(() => {
    return allCategories
      .filter((cat) => {
        const catId = String(cat._id);
        if (isEdit && catId === String(categoryId)) return false;
        if (descendantIds.has(catId)) return false;
        return true;
      })
      .sort((a, b) => {
        if ((a.level || 0) !== (b.level || 0)) return (a.level || 0) - (b.level || 0);
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [allCategories, categoryId, descendantIds, isEdit]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories?flat=true", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load categories");
        setAllCategories(json.categories || []);

        if (isEdit) {
          const editRes = await fetch(`/api/categories/${categoryId}`, { credentials: "include" });
          const editJson = await editRes.json();
          if (!editRes.ok || !editJson.success) throw new Error(editJson.error || "Failed to load category");
          const cat = editJson.category;
          setForm({
            name: cat.name || "",
            slug: cat.slug || "",
            description: cat.description || "",
            image: {
              url: cat.image?.url || "",
              publicId: cat.image?.publicId || "",
              altText: cat.image?.altText || "",
              title: cat.image?.title || "",
            },
            parentCategory: cat.parentCategory?._id ? String(cat.parentCategory._id) : "",
            status: cat.status || "active",
            featured: Boolean(cat.featured ?? cat.isFeatured),
            showInNav: cat?.showInNav === true,
            showInFooter: cat?.showInFooter === true,
            showOnHomepage: cat?.showOnHomepage === true,
            homepageOrder: Number(cat?.homepageOrder) || 0,
            homepageIcon: String(cat?.homepageIcon || ""),
            sortOrder: Number(cat.sortOrder) || 0,
            seo: {
              metaTitle: cat.seo?.metaTitle || "",
              metaDescription: cat.seo?.metaDescription || "",
              keywords: Array.isArray(cat.seo?.metaKeywords)
                ? cat.seo.metaKeywords.join(", ")
                : typeof cat.seo?.keywords === "string"
                  ? cat.seo.keywords
                  : "",
            },
          });
          setSlugEdited(true);
        } else {
          setForm((f) => ({ ...f, parentCategory: initialParentId || "" }));
        }
      } catch (error) {
        toast.error(error.message || "Failed to load editor");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryId, initialParentId, isEdit]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const kwString = form.seo?.keywords || "";
      const payload = {
        ...form,
        showInNav: Boolean(form.showInNav),
        showInFooter: Boolean(form.showInFooter),
        showOnHomepage: Boolean(form.showOnHomepage),
        homepageOrder: Number(form.homepageOrder) || 0,
        homepageIcon: String(form.homepageIcon || ""),
        slug: slugify(form.slug || form.name),
        parentCategory: form.parentCategory || null,
        seo: {
          ...form.seo,
          metaKeywords: kwString
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
      };
      const res = await fetch(isEdit ? `/api/categories/${categoryId}` : "/api/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success(isEdit ? "Category updated" : "Category created");
      router.push("/catalog/categories");
      router.refresh();
    } catch (err) {
      toast.error(err?.message || String(err) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!window.confirm("This will remove the category. Products in this category will be uncategorized.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Category deleted");
      router.push("/catalog/categories");
      router.refresh();
    } catch (err) {
      toast.error(err?.message || String(err) || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const selectedParent = form.parentCategory ? categoryMap.get(String(form.parentCategory)) : null;
  const parentPathNames = useMemo(() => {
    if (!selectedParent) return [];
    const names = [];
    (selectedParent.ancestors || []).forEach((ancestor) => {
      const id = String(ancestor?._id || ancestor);
      const found = categoryMap.get(id);
      if (found?.name) names.push(found.name);
    });
    names.push(selectedParent.name);
    return names;
  }, [categoryMap, selectedParent]);

  const levelLabel = !selectedParent
    ? "Top Level"
    : Number(selectedParent.level || 0) + 1 === 1
      ? "Sub"
      : "Sub-Sub";

  if (loading) {
    return <div style={{ padding: 24, color: "#9ca3af" }}>Loading category editor...</div>;
  }

  const inputStyle = {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
  };
  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ ...cardStyle, display: "flex", gap: 8 }}>
          {[
            { id: "basic", label: "Basic Info" },
            { id: "image", label: "Image" },
            { id: "seo", label: "SEO" },
            ...(isEdit ? [{ id: "products", label: "Products" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "7px 12px",
                background: activeTab === tab.id ? "#eff6ff" : "#fff",
                color: activeTab === tab.id ? "#1d4ed8" : "#374151",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "basic" ? (
          <>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Basic</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Category Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                    }}
                    style={inputStyle}
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>/categories/{form.slug || "slug"}</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Description
                  </label>
                  <TinyEditor
                    value={form.description || ""}
                    onChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        description: val,
                      }))
                    }
                    height={300}
                    placeholder="Write category description..."
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Parent Category</h3>
              <select
                value={form.parentCategory || ""}
                onChange={(e) => setForm((f) => ({ ...f, parentCategory: e.target.value }))}
                style={inputStyle}
              >
                <option value="">-- None (Top Level Category) --</option>
                {parentOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {"-".repeat((c.level || 0) * 2)} {c.name}
                  </option>
                ))}
              </select>
              {selectedParent ? (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280" }}>
                  📍 Path: {[...parentPathNames, form.name || "[current name]"].join(" > ")}
                </p>
              ) : null}
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>
                This will be a {levelLabel} category
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Display Settings</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: "active" }))}
                    style={{
                      flex: 1,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "8px 10px",
                      background: form.status === "active" ? "#dcfce7" : "#fff",
                    }}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: "draft" }))}
                    style={{
                      flex: 1,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "8px 10px",
                      background: form.status === "draft" ? "#e5e7eb" : "#fff",
                    }}
                  >
                    Draft
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Featured Category</p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Show on homepage</p>
                  </div>
                  <label
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: 44,
                      height: 24,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.featured || false}
                      onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                      style={{ display: "none" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: form.featured ? "#009688" : "#d1d5db",
                        borderRadius: 99,
                        transition: "background 0.2s",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: form.featured ? 22 : 2,
                        width: 20,
                        height: 20,
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "image" ? (
          <div style={cardStyle}>
            <ImageUploader
              value={form.image?.url ? form.image : null}
              onChange={(image) => setForm((f) => ({ ...f, image: image || { url: "", publicId: "", altText: "", title: "" } }))}
              multiple={false}
              uploadFolder="categories"
            />
            {form.image?.url ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Image Title</label>
                  <input
                    value={form.image.title || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, image: { ...f.image, title: e.target.value } }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Image Alt Text</label>
                  <input
                    value={form.image.altText || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, image: { ...f.image, altText: e.target.value } }))
                    }
                    style={inputStyle}
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>Tip: describe the image for SEO and accessibility.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Flip H", "Rotate", "Watermark"].map((b) => (
                    <button
                      key={b}
                      type="button"
                      style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", background: "#fff" }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "products" && isEdit ? (
          <CategoryProductsTab categoryId={categoryId} />
        ) : null}

        {activeTab === "seo" ? (
          <div style={cardStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <SeoField
                type="title"
                label="Meta Title"
                value={form.seo.metaTitle}
                onChange={(value) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle: value } }))}
              />
              <SeoField
                type="description"
                label="Meta Description"
                value={form.seo.metaDescription}
                onChange={(value) => setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription: value } }))}
              />
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Keywords
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>(comma separated)</span>
                </label>
                <input
                  type="text"
                  value={form.seo.keywords || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      seo: { ...f.seo, keywords: e.target.value },
                    }))
                  }
                  placeholder="car accessories, seat covers, floor mats, Crazzycars.pk"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 14,
                    color: "#111827",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#fff",
                    fontFamily: "inherit",
                  }}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                  Add relevant keywords to help search engines find this category
                </p>
              </div>
              <SeoPreview
                title={form.seo.metaTitle || form.name || "Category"}
                description={form.seo.metaDescription || form.description || ""}
                slug={`categories/${form.slug || "category"}`}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ position: "sticky", top: 20, alignSelf: "start", display: "grid", gap: 12 }}>
        <div style={cardStyle}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>Status</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, status: "active" }))}
              style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", background: form.status === "active" ? "#dcfce7" : "#fff" }}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, status: "draft" }))}
              style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", background: form.status === "draft" ? "#e5e7eb" : "#fff" }}
            >
              Draft
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
            Featured
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", marginTop: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Show in Navigation Bar</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Display this category directly in the nav bar</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.showInNav}
              aria-label="Show in Navigation Bar"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  showInNav: !f.showInNav,
                }))
              }
              style={{
                position: "relative",
                display: "inline-block",
                width: 44,
                height: 24,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: form.showInNav ? "#009688" : "#d1d5db",
                  borderRadius: 99,
                  transition: "background 0.2s",
                  pointerEvents: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: form.showInNav ? 22 : 2,
                  width: 20,
                  height: 20,
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  pointerEvents: "none",
                }}
              />
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", marginTop: 4 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Show in Footer</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                Toggle to show this category in footer navigation
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.showInFooter}
              aria-label="Show in Footer"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  showInFooter: !f.showInFooter,
                }))
              }
              style={{
                position: "relative",
                display: "inline-block",
                width: 44,
                height: 24,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: form.showInFooter ? "#009688" : "#d1d5db",
                  borderRadius: 99,
                  transition: "background 0.2s",
                  pointerEvents: "none",
                }}
              />
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
                  pointerEvents: "none",
                }}
              />
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} style={inputStyle} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Homepage Order</label>
            <input type="number" value={form.homepageOrder} onChange={(e) => setForm((f) => ({ ...f, homepageOrder: parseInt(e.target.value, 10) || 0 }))} style={inputStyle} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Homepage Icon (emoji or URL)</label>
            <input value={form.homepageIcon || ""} onChange={(e) => setForm((f) => ({ ...f, homepageIcon: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", marginTop: 4 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>Show on Homepage</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Display this category in homepage grid</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.showOnHomepage}
              aria-label="Show on Homepage"
              onClick={() => setForm((f) => ({ ...f, showOnHomepage: !f.showOnHomepage }))}
              style={{ position: "relative", display: "inline-block", width: 44, height: 24, padding: 0, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}
            >
              <span style={{ position: "absolute", inset: 0, background: form.showOnHomepage ? "#009688" : "#d1d5db", borderRadius: 99 }} />
              <span style={{ position: "absolute", top: 2, left: form.showOnHomepage ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%" }} />
            </button>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 12, width: "100%", border: "none", borderRadius: 8, padding: "10px 12px", background: "#009688", color: "#fff", fontWeight: 700 }}>
            {saving ? "Saving..." : "Save Category"}
          </button>
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ marginTop: 8, width: "100%", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 12px", background: "#fff", color: "#ef4444", fontWeight: 700 }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
          <Link href="/catalog/categories" style={{ marginTop: 8, display: "block", textAlign: "center", color: "#374151", fontSize: 13 }}>
            ← Back
          </Link>
        </div>

        <div style={cardStyle}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Category Path</p>
          <p style={{ margin: 0, color: "#111827", fontWeight: 600 }}>
            {[...parentPathNames, form.name || "New Category"].join(" > ")}
          </p>
        </div>
      </div>
    </form>
  );
}
