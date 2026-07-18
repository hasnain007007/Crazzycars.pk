"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { getStorefrontBaseUrl, getStorefrontPageUrl } from "@/lib/storefrontUrl";

const RichTextEditor = dynamic(() => import("../ui/RichTextEditor"), { ssr: false });

const EMPTY_FORM = {
  title: "",
  slug: "",
  content: "",
  template: "custom",
  status: "draft",
  seo: { metaTitle: "", metaDescription: "", keywords: "", canonical: "" },
  showInNav: false,
  showInFooter: false,
  showInInfoBar: false,
  icon: "",
  featured: false,
  passwordProtected: false,
  password: "",
  openInNewTab: false,
  externalUrl: "",
  sortOrder: 0,
};

function FooterToggle({ checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 16px",
        background: "#f9fafb",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        cursor: "pointer",
        marginBottom: 20,
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
          Show in footer
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          {checked
            ? "This page appears in the store footer Customer Care links."
            : "This page is hidden from the store footer."}
        </p>
      </div>
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          height: 28,
          width: 52,
          flexShrink: 0,
          alignItems: "center",
          borderRadius: 999,
          background: checked ? "#009688" : "#d1d5db",
          transition: "background 0.2s",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            display: "inline-block",
            height: 22,
            width: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transform: checked ? "translateX(26px)" : "translateX(3px)",
            transition: "transform 0.2s",
          }}
        />
      </span>
    </label>
  );
}

const PAGE_TEMPLATES = [
  {
    title: "About Us",
    slug: "about-us",
    template: "about",
    content: `<h2>Our Story</h2>
<p>${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} was founded in Gujranwala, Pakistan, to bring premium car accessories — splitters, LED lighting, body kits, and more — to drivers nationwide.</p>
<h2>Our Promise</h2>
<p>Every product is selected for quality, fit, and value. We only stock accessories we would use on our own cars.</p>
<h2>Why Shop With Us</h2>
<p>Cash on Delivery, fast delivery across Pakistan, and expert support for every make and model.</p>`,
  },
  {
    title: "Contact Us",
    slug: "contact-us",
    template: "contact",
    content: `<h2>Get In Touch</h2>
<p>We would love to hear from you. Contact us using the details below or fill in the contact form.</p>
<h2>Email</h2>
<p>support@crazzycars.pk</p>
<h2>Response Time</h2>
<p>We reply to all enquiries within 24 hours Monday to Friday.</p>`,
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    template: "policy",
    content: `<h2>Privacy Policy</h2>
<p>Last updated: ${new Date().toLocaleDateString("en-GB")}</p>
<h2>Information We Collect</h2>
<p>We collect information you provide when placing an order or contacting us.</p>
<h2>How We Use Your Information</h2>
<p>We use your information to process orders and provide customer service.</p>`,
  },
  {
    title: "Terms & Conditions",
    slug: "terms-conditions",
    template: "policy",
    content: `<h2>Terms & Conditions</h2>
<p>Last updated: ${new Date().toLocaleDateString("en-GB")}</p>
<h2>Acceptance of Terms</h2>
<p>By using our website you agree to these terms.</p>
<h2>Products</h2>
<p>All products are subject to availability.</p>`,
  },
  {
    title: "Shipping Policy",
    slug: "shipping-policy",
    template: "policy",
    content: `<h2>Shipping Information</h2>
<h3>Pakistan — major cities</h3>
<p>Standard delivery 1–3 business days. Free delivery on orders over Rs. 2,999 (where applicable by zone).</p>
<h3>Pakistan — other areas</h3>
<p>Delivery typically 2–5 business days; rates vary by city and weight band (shown at checkout).</p>
<h3>Remote areas</h3>
<p>Allow extra transit time; free shipping thresholds may be higher for remote zones.</p>
<h2>Secure Packaging</h2>
<p>All orders are packed securely to protect your car accessories in transit.</p>`,
  },
  {
    title: "Returns Policy",
    slug: "returns-policy",
    template: "policy",
    content: `<h2>Returns & Exchanges</h2>
<h3>30 Day Returns</h3>
<p>We accept returns within 30 days of purchase on unworn items.</p>
<h3>Hygiene Policy</h3>
<p>Opened or installed accessories may not be eligible for return unless faulty — see product page for details.</p>
<h3>How to Return</h3>
<p>Contact our team at support@crazzycars.pk to start a return.</p>`,
  },
  {
    title: "FAQ",
    slug: "faq",
    template: "faq",
    content: `<h2>Frequently Asked Questions</h2>
<h3>Do you offer Cash on Delivery?</h3>
<p>Yes — pay when your order arrives at your doorstep on eligible orders across Pakistan.</p>
<h3>How do I choose the right accessory for my car?</h3>
<p>Check each product listing for compatible makes and models, or contact us on WhatsApp for help.</p>
<h3>How long does delivery take?</h3>
<p>Most orders arrive within 2–5 business days depending on your city.</p>
<h3>Do you ship discreetly?</h3>
<p>Yes! All orders ship in plain unmarked packaging with no indication of contents.</p>`,
  },
];

export default function PagesManager() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages", {
        credentials: "include",
      });
      const data = await res.json();
      console.log("fetchPages response:", data);
      if (data.success) {
        setPages(data.pages || []);
      } else {
        console.error("fetchPages error:", data.error);
        toast.error(`Failed to load pages: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("fetchPages catch:", e);
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const generateSlug = (title) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleTitleChange = (title) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugManual ? f.slug : generateSlug(title),
    }));
  };

  const handleUseTemplate = (template) => {
    setForm((f) => ({
      ...f,
      title: template.title,
      slug: template.slug,
      template: template.template,
      content: template.content,
      status: "draft",
    }));
    setSlugManual(true);
    setShowTemplates(false);
    toast.success(`Template loaded: ${template.title}`);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Page title is required");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Page slug is required");
      return;
    }
    setSaving(true);
    try {
      const url = editingPage ? `/api/pages/${editingPage._id}` : "/api/pages";
      const method = editingPage ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          showInFooter: Boolean(form.showInFooter),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingPage ? "Page updated!" : "Page created!");
        setShowForm(false);
        setEditingPage(null);
        setForm(EMPTY_FORM);
        setSlugManual(false);
        fetchPages();
      } else {
        toast.error(data.error || "Save failed");
        console.error("Save error:", data.error);
      }
    } catch (e) {
      console.error("Save catch:", e);
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setForm({
      title: page.title || "",
      slug: page.slug || "",
      content: page.content || "",
      template: page.template || "custom",
      status: page.status || "draft",
      seo: {
        metaTitle: page.seo?.metaTitle || "",
        metaDescription: page.seo?.metaDescription || "",
        keywords: page.seo?.keywords || "",
        canonical: page.seo?.canonical || "",
      },
      showInNav: page.showInNav || false,
      showInFooter: Boolean(page.showInFooter),
      showInInfoBar: page.showInInfoBar || false,
      icon: page.icon || "",
      featured: page.featured || false,
      passwordProtected: page.passwordProtected || false,
      password: page.password || "",
      openInNewTab: page.openInNewTab || false,
      externalUrl: page.externalUrl || "",
      sortOrder: page.sortOrder || 0,
    });
    setSlugManual(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete page "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Page deleted!");
        fetchPages();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch (e) {
      console.error("Delete catch:", e);
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleToggleStatus = async (page) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/pages/${page._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPages();
        toast.success(newStatus === "published" ? "Page published!" : "Page set to draft");
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  const templateColors = {
    custom: { bg: "#f3f4f6", color: "#374151" },
    about: { bg: "#e6f7f5", color: "#009688" },
    contact: { bg: "#eff6ff", color: "#3b82f6" },
    faq: { bg: "#fef3c7", color: "#d97706" },
    policy: { bg: "#fce7f3", color: "#ec4899" },
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Pages</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Create and manage custom pages like About Us, Privacy Policy, FAQ etc.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowTemplates((p) => !p)}
            style={{
              padding: "10px 18px",
              background: "#fff",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Use Template
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingPage(null);
              setForm(EMPTY_FORM);
              setSlugManual(false);
              setShowForm(true);
              setShowTemplates(false);
            }}
            style={{
              padding: "10px 18px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            New Page
          </button>
        </div>
      </div>

      {showTemplates && (
        <div style={{ background: "#fff", border: "2px solid #e5e7eb", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Page Templates</h3>
            <button type="button" onClick={() => setShowTemplates(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>
              ✕
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
            Start with a pre-built template. You can edit all content after loading.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {PAGE_TEMPLATES.map((template, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  handleUseTemplate(template);
                  setShowForm(true);
                }}
                style={{ padding: "16px", background: "#f9fafb", border: "2px solid #e5e7eb", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{template.title}</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>/{template.slug}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background: "#fff", border: "2px solid #009688", borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{editingPage ? `Editing: ${editingPage.title}` : "New Page"}</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingPage(null);
                setForm(EMPTY_FORM);
                setSlugManual(false);
              }}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Page Title *</label>
              <input style={inputStyle} placeholder="e.g. About Us" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>URL Slug *</label>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 6px" }}>URL: /{"{slug}"} (e.g. /about-us)</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>/</span>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="about-us"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    }));
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>Page will be available at: /{form.slug || "page-slug"}</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Page Icon (optional)</label>
            <input
              style={inputStyle}
              placeholder="Optional short label"
              value={form.icon || ""}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>Optional marker shown next to page title</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Page Type</label>
              <select value={form.template} onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))} style={inputStyle}>
                <option value="custom">Custom Page</option>
                <option value="about">About Page</option>
                <option value="contact">Contact Page</option>
                <option value="faq">FAQ Page</option>
                <option value="policy">Policy Page</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["draft", "published"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      borderColor: form.status === s ? "#009688" : "#e5e7eb",
                      background: form.status === s ? "#009688" : "#fff",
                      color: form.status === s ? "#fff" : "#374151",
                    }}
                  >
                    {s === "published" ? "Published" : "Draft"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="0"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <FooterToggle
            checked={!!form.showInFooter}
            onChange={(showInFooter) => setForm((f) => ({ ...f, showInFooter }))}
          />

          <div style={{ display: "flex", gap: 24, marginBottom: 20, padding: "14px 16px", background: "#f9fafb", borderRadius: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
              <input type="checkbox" checked={form.showInNav} onChange={(e) => setForm((f) => ({ ...f, showInNav: e.target.checked }))} style={{ accentColor: "#009688" }} />
              Show in Navigation Menu
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
              <input type="checkbox" checked={form.showInInfoBar || false} onChange={(e) => setForm((f) => ({ ...f, showInInfoBar: e.target.checked }))} style={{ accentColor: "#009688" }} />
              Show in Information Bar
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
              <input type="checkbox" checked={form.featured || false} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} style={{ accentColor: "#009688" }} />
              Featured page (show on homepage)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
              <input type="checkbox" checked={form.passwordProtected || false} onChange={(e) => setForm((f) => ({ ...f, passwordProtected: e.target.checked }))} style={{ accentColor: "#009688" }} />
              Password protected
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
              <input type="checkbox" checked={form.openInNewTab || false} onChange={(e) => setForm((f) => ({ ...f, openInNewTab: e.target.checked }))} style={{ accentColor: "#009688" }} />
              Open in new tab
            </label>
          </div>

          {form.passwordProtected ? (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Page Password</label>
              <input
                type="password"
                style={inputStyle}
                placeholder="Page password"
                value={form.password || ""}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          ) : null}

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>External URL (optional)</label>
            <input
              type="url"
              style={inputStyle}
              placeholder="https://crazzycars.pk (leave blank for normal page)"
              value={form.externalUrl || ""}
              onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>If set, clicking this page link redirects to this URL</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Page Content</label>
            <RichTextEditor value={form.content} onChange={(val) => setForm((f) => ({ ...f, content: val }))} placeholder="Write your page content here..." minHeight={300} />
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ background: "#f9fafb", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>SEO Settings</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Control how this page appears in Google search results</p>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={labelStyle}>Meta Title</label>
                  <span style={{ fontSize: 11, color: (form.seo?.metaTitle || form.title || "").length > 60 ? "#ef4444" : "#9ca3af" }}>
                    {(form.seo?.metaTitle || form.title || "").length} / 60
                  </span>
                </div>
                <input
                  style={inputStyle}
                  placeholder={(form.title || "Page Title") + " | " + (process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk")}
                  value={form.seo?.metaTitle || ""}
                  onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle: e.target.value } }))}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                  Shown in browser tab and Google results. Keep under 60 characters.
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={labelStyle}>Meta Description</label>
                  <span style={{ fontSize: 11, color: (form.seo?.metaDescription || "").length > 160 ? "#ef4444" : "#9ca3af" }}>
                    {(form.seo?.metaDescription || "").length} / 160
                  </span>
                </div>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Brief description shown in Google search results..."
                  value={form.seo?.metaDescription || ""}
                  onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription: e.target.value } }))}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                  Shown in Google search results. Keep under 160 characters.
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Keywords
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
                    (comma separated)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  placeholder="car accessories pakistan, seat covers, floor mats, Crazzycars.pk"
                  value={form.seo?.keywords || ""}
                  onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, keywords: e.target.value } }))}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Canonical URL
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>
                    (optional - leave blank for auto)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  placeholder={getStorefrontPageUrl(form.slug || "page-slug")}
                  value={form.seo?.canonical || ""}
                  onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, canonical: e.target.value } }))}
                />
              </div>

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                  Google Search Preview
                </p>
                <div>
                  <p style={{ fontSize: 12, color: "#16a34a", margin: "0 0 2px", fontFamily: "monospace" }}>
                    {getStorefrontBaseUrl()}/pages/{form.slug || "page-slug"}
                  </p>
                  <p style={{ fontSize: 18, color: "#1a0dab", margin: "0 0 4px", fontWeight: 400, lineHeight: 1.3, maxWidth: 500 }}>
                    {form.seo?.metaTitle || (form.title ? form.title + " | " + (process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk") : "Page Title | " + (process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"))}
                  </p>
                  <p style={{ fontSize: 13, color: "#545454", margin: 0, lineHeight: 1.5, maxWidth: 500, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {form.seo?.metaDescription || "No description set. Add a meta description to improve click-through rates from Google."}
                  </p>
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>SEO Tips</p>
                <ul style={{ fontSize: 12, color: "#92400e", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Keep title under 60 characters</li>
                  <li>Keep description under 160 characters</li>
                  <li>Include relevant keywords naturally</li>
                  <li>Make description compelling to improve clicks</li>
                  <li>Each page should have a unique title and description</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: 14,
                background: saving ? "#9ca3af" : "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving..." : editingPage ? "Update Page" : "Create Page"}
            </button>
            {form.status === "draft" && (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, status: "published" }));
                  setTimeout(handleSave, 100);
                }}
                disabled={saving}
                style={{
                  padding: "14px 24px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Save & Publish
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading pages...</div>
      ) : pages.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, background: "#f9fafb", borderRadius: 16, border: "2px dashed #e5e7eb" }}>
          <h3 style={{ fontSize: 18, color: "#374151", margin: "0 0 8px" }}>No pages yet</h3>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 20px" }}>Create your first page or use a template</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button type="button" onClick={() => setShowTemplates(true)} style={{ padding: "10px 20px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
              Use Template
            </button>
            <button type="button" onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "#009688", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + New Page
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, padding: "10px 16px", background: "#f9fafb", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Page Title</span>
            <span>URL</span>
            <span>Type</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {pages.map((page) => {
            const tc = templateColors[page.template] || templateColors.custom;
            return (
              <div key={page._id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, padding: "14px 16px", background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10, alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{page.title}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {page.showInNav && <span style={{ fontSize: 10, background: "#e6f7f5", color: "#009688", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>In Nav</span>}
                    {page.showInFooter && <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>In Footer</span>}
                    {page.showInInfoBar && <span style={{ fontSize: 10, background: "#fff7ed", color: "#9a3412", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>In Info Bar</span>}
                  </div>
                </div>

                <a
                  href={getStorefrontPageUrl(page.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "#009688",
                    textDecoration: "none",
                    fontFamily: "monospace",
                  }}
                >
                  /{page.slug}
                </a>

                <span style={{ display: "inline-block", padding: "3px 10px", background: tc.bg, color: tc.color, borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{page.template}</span>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(page)}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid",
                    borderRadius: 99,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    background: page.status === "published" ? "#dcfce7" : "#f3f4f6",
                    color: page.status === "published" ? "#16a34a" : "#6b7280",
                    borderColor: page.status === "published" ? "#86efac" : "#e5e7eb",
                  }}
                >
                  {page.status === "published" ? "Published" : "Draft"}
                </button>

                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={getStorefrontPageUrl(page.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 12px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#16a34a",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Preview
                  </a>
                  <button type="button" onClick={() => handleEdit(page)} style={{ padding: "6px 14px", background: "#f3f4f6", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(page._id, page.title)} style={{ padding: "6px 10px", background: "#fee2e2", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#dc2626" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
