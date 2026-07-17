"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const SOCIAL_KEYS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["twitter", "Twitter/X"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["whatsapp", "WhatsApp"],
];

const DEFAULT_SHOP_LINKS = [
  { label: "All Products", href: "/shop", enabled: true },
  { label: "New Arrivals", href: "/shop?sort=newest", enabled: true },
  { label: "Best Sellers", href: "/shop?sort=popular", enabled: true },
  { label: "On Sale", href: "/sale", enabled: true },
  { label: "Gift Ideas", href: "/shop?tag=gift", enabled: true },
];

const DEFAULT_CUSTOMER_CARE_LINKS = [
  { label: "Contact Us", href: "/pages/contact", enabled: true },
  { label: "FAQ", href: "/pages/faq", enabled: true },
  { label: "Shipping Info", href: "/pages/shipping", enabled: true },
  { label: "Returns & Refunds", href: "/pages/returns", enabled: true },
  { label: "Track My Order", href: "/account/orders", enabled: true },
  { label: "Privacy Policy", href: "/pages/privacy", enabled: true },
  { label: "Terms of Service", href: "/pages/terms", enabled: true },
];

const DEFAULT_CATEGORIES_LINKS = [
  { label: "Seat Covers", href: "/categories/seat-covers", enabled: true },
  { label: "Floor Mats", href: "/categories/floor-mats", enabled: true },
  { label: "Steering Covers", href: "/categories/steering-covers", enabled: true },
  { label: "Car Care", href: "/categories/car-care", enabled: true },
  { label: "LED Lights", href: "/categories/led-lights", enabled: true },
  { label: "Phone Holders", href: "/categories/phone-holders", enabled: true },
];

const FOOTER_INPUT_STYLE = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 14,
  color: "#111111",
  background: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const FOOTER_LABEL_STYLE = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const FOOTER_SECTION_TITLE = {
  fontSize: 16,
  fontWeight: 700,
  color: "#111111",
  margin: "0 0 16px",
};

const FOOTER_CONTENT_DEFAULTS = {
  companyName: "Crazzycars.pk",
  tagline: "Pakistan's Premier Car Accessories Store",
  copyrightText: `© ${new Date().getFullYear()} Crazzycars.pk. All Rights Reserved.`,
  contactEmail: "info@crazzycars.pk",
  phone: "+92 324 422 0007",
  registeredAddress: "Sialkot, Punjab, Pakistan",
};

function LinkManager({ title, links, setLinks }) {
  const addLink = () => {
    setLinks((prev) => [...prev, { label: "", href: "", enabled: true }]);
  };

  const updateLink = (index, field, value) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeLink = (index) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleLink = (index) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, enabled: !l.enabled } : l)));
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          background: "#f9fafb",
          padding: "14px 20px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: 0 }}>{title}</h3>
        <button
          type="button"
          onClick={addLink}
          style={{
            padding: "6px 14px",
            background: "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Link
        </button>
      </div>
      <div style={{ padding: 16 }}>
        {links.map((link, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              padding: "8px 12px",
              background: link.enabled ? "#f9fafb" : "#f3f4f6",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <label
              style={{
                position: "relative",
                display: "inline-block",
                width: 32,
                height: 18,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <input type="checkbox" checked={link.enabled} onChange={() => toggleLink(index)} style={{ display: "none" }} />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: link.enabled ? "#009688" : "#d1d5db",
                  borderRadius: 99,
                  transition: "background 0.2s",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: link.enabled ? 16 : 2,
                  width: 14,
                  height: 14,
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </label>
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(index, "label", e.target.value)}
              placeholder="Link label"
              style={{
                flex: 1,
                padding: "6px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                outline: "none",
              }}
            />
            <input
              type="text"
              value={link.href}
              onChange={(e) => updateLink(index, "href", e.target.value)}
              placeholder="/page-url"
              style={{
                flex: 1,
                padding: "6px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 13,
                color: "#111827",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => removeLink(index)}
              style={{
                width: 28,
                height: 28,
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 6,
                color: "#DC2626",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
        {links.length === 0 && (
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "12px 0", fontStyle: "italic" }}>
            No links added. Click &quot;+ Add Link&quot;
          </p>
        )}
      </div>
    </div>
  );
}

function AutoFooterCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories?flat=true", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
      const rows = (json.categories || json.data || [])
        .filter((c) => c.status === "active")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));
      setCategories(rows);
    } catch (e) {
      toast.error(e.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFooter(cat) {
    const id = String(cat._id);
    const next = !cat.showInFooter;
    setBusyId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInFooter: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
      setCategories((prev) =>
        prev.map((c) => (String(c._id) === id ? { ...c, showInFooter: next } : c))
      );
    } catch (e) {
      toast.error(e.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const footerCount = categories.filter((c) => c.showInFooter).length;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div style={{ background: "#f9fafb", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: 0 }}>Auto Categories in Footer</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>
          These categories appear in the storefront footer automatically ({footerCount} enabled). Manual category
          links below are used only when none are enabled.
        </p>
      </div>
      <div style={{ padding: 16, maxHeight: 280, overflowY: "auto" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading categories…</p>
        ) : categories.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No active categories found.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {categories.map((cat) => (
              <li
                key={cat._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{cat.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>/categories/{cat.slug}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === String(cat._id)}
                  onClick={() => toggleFooter(cat)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: cat.showInFooter ? "#10b981" : "#e5e7eb",
                    background: cat.showInFooter ? "#ecfdf5" : "#fff",
                    color: cat.showInFooter ? "#047857" : "#6b7280",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {busyId === String(cat._id) ? "…" : cat.showInFooter ? "In footer" : "Off"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline = false, placeholder = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={FOOTER_LABEL_STYLE}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          style={{ ...FOOTER_INPUT_STYLE, resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={FOOTER_INPUT_STYLE}
        />
      )}
    </div>
  );
}

export function FooterSettings({ settings, setSettings, onSave }) {
  const g = settings.general || {};
  const f = settings.footer || {};
  const social = f.social || {};
  const appLinks = f.appLinks || {};
  const logoUrl = g.logoUrl || g.logo?.url || "";
  const storeNameDisplay =
    String(g.storeName ?? "").trim() || FOOTER_CONTENT_DEFAULTS.companyName;

  const setGeneral = (patch) =>
    setSettings({ ...settings, general: { ...g, ...patch } });

  const [shopLinks, setShopLinks] = useState(
    Array.isArray(f.shopLinks) && f.shopLinks.length > 0 ? f.shopLinks : DEFAULT_SHOP_LINKS
  );
  const [customerCareLinks, setCustomerCareLinks] = useState(
    Array.isArray(f.customerCareLinks) && f.customerCareLinks.length > 0 ? f.customerCareLinks : DEFAULT_CUSTOMER_CARE_LINKS
  );
  const [categoriesLinks, setCategoriesLinks] = useState(
    Array.isArray(f.categoriesLinks) && f.categoriesLinks.length > 0 ? f.categoriesLinks : DEFAULT_CATEGORIES_LINKS
  );

  useEffect(() => {
    setShopLinks(Array.isArray(f.shopLinks) && f.shopLinks.length > 0 ? f.shopLinks : DEFAULT_SHOP_LINKS);
    setCustomerCareLinks(
      Array.isArray(f.customerCareLinks) && f.customerCareLinks.length > 0 ? f.customerCareLinks : DEFAULT_CUSTOMER_CARE_LINKS
    );
    setCategoriesLinks(
      Array.isArray(f.categoriesLinks) && f.categoriesLinks.length > 0 ? f.categoriesLinks : DEFAULT_CATEGORIES_LINKS
    );
  }, [f.shopLinks, f.customerCareLinks, f.categoriesLinks]);

  const setFooter = (patch) => setSettings({ ...settings, footer: { ...f, ...patch } });

  const handleSave = () => {
    onSave({
      general: {
        storeName: storeNameDisplay,
        showStoreName: g.showStoreName !== false,
        logoUrl: logoUrl,
        logo: g.logo && typeof g.logo === "object" ? g.logo : { url: logoUrl, publicId: g.logo?.publicId || "" },
      },
      footer: {
        ...f,
        ...settings.footer,
        copyrightText: f.copyrightText || settings.footer?.copyrightText || "",
        companyName: f.companyName || "",
        registeredAddress: f.registeredAddress || "",
        trustpilotUrl: f.trustpilotUrl || "",
        tagline: f.tagline || "",
        contactEmail: f.contactEmail || f.email || "",
        email: f.contactEmail || f.email || "",
        phone: f.phone || "",
        social: f.social || {},
        showPaymentIcons: f.showPaymentIcons !== false,
        showLogoInFooter: f.showLogoInFooter !== false,
        appLinks: f.appLinks || {},
        shopLinks,
        customerCareLinks,
        categoriesLinks,
      },
    });
  };

  return (
    <div
      className="space-y-6 rounded-xl border border-slate-200 p-6"
      style={{ background: "#FFFFFF", color: "#111111" }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={FOOTER_SECTION_TITLE}>Store identity (footer)</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={FOOTER_LABEL_STYLE}>Store name</label>
          <input
            type="text"
            value={storeNameDisplay}
            onChange={(e) => setGeneral({ storeName: e.target.value })}
            placeholder="Crazzycars.pk"
            style={FOOTER_INPUT_STYLE}
          />
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
            Shown in the footer when &quot;Show Store Name&quot; is selected below.
          </p>
        </div>

        {logoUrl ? (
          <div style={{ marginBottom: 16 }}>
            <label style={FOOTER_LABEL_STYLE}>Logo preview</label>
            <div
              style={{
                display: "inline-flex",
                padding: 12,
                background: "#111111",
                borderRadius: 8,
                border: "1px solid #E5E7EB",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={storeNameDisplay}
                style={{ maxWidth: 220, maxHeight: 72, objectFit: "contain", display: "block" }}
              />
            </div>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
              Upload or change the logo under Settings → General.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            No logo uploaded yet. Add one in Settings → General to show it in the footer.
          </p>
        )}

        <h3 style={{ ...FOOTER_SECTION_TITLE, marginTop: 8 }}>Footer logo display</h3>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setFooter({ showLogoInFooter: true })}
            style={{
              flex: 1,
              padding: "10px",
              background: f.showLogoInFooter !== false ? "#111111" : "#FFFFFF",
              color: f.showLogoInFooter !== false ? "#FFFFFF" : "#374151",
              border: "2px solid",
              borderColor: f.showLogoInFooter !== false ? "#111111" : "#E5E7EB",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Show Logo
          </button>
          <button
            type="button"
            onClick={() => setFooter({ showLogoInFooter: false })}
            style={{
              flex: 1,
              padding: "10px",
              background: f.showLogoInFooter === false ? "#111111" : "#FFFFFF",
              color: f.showLogoInFooter === false ? "#FFFFFF" : "#374151",
              border: "2px solid",
              borderColor: f.showLogoInFooter === false ? "#111111" : "#E5E7EB",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Show Store Name
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
          Choose whether to show the logo image or the store name text in the footer.
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={FOOTER_SECTION_TITLE}>Contact Information</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={FOOTER_LABEL_STYLE}>Footer Email</label>
          <input
            type="email"
            value={f.contactEmail || f.email || FOOTER_CONTENT_DEFAULTS.contactEmail}
            onChange={(e) => setFooter({ contactEmail: e.target.value, email: e.target.value })}
            placeholder="info@crazzycars.pk"
            style={FOOTER_INPUT_STYLE}
          />
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Shown in footer contact section</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={FOOTER_LABEL_STYLE}>Footer Phone</label>
          <input
            type="text"
            value={f.phone || FOOTER_CONTENT_DEFAULTS.phone}
            onChange={(e) => setFooter({ phone: e.target.value })}
            placeholder="+92 324 422 0007"
            style={FOOTER_INPUT_STYLE}
          />
        </div>

        <div>
          <label style={FOOTER_LABEL_STYLE}>Footer Tagline</label>
          <textarea
            value={f.tagline || FOOTER_CONTENT_DEFAULTS.tagline}
            onChange={(e) => setFooter({ tagline: e.target.value })}
            placeholder="Pakistan's Premier Car Accessories Store"
            rows={3}
            style={{ ...FOOTER_INPUT_STYLE, resize: "vertical" }}
          />
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={FOOTER_SECTION_TITLE}>Company Information</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={FOOTER_LABEL_STYLE}>Company Legal Name</label>
          <input
            type="text"
            value={f.companyName || FOOTER_CONTENT_DEFAULTS.companyName}
            onChange={(e) => setFooter({ companyName: e.target.value })}
            placeholder="Crazzycars.pk"
            style={FOOTER_INPUT_STYLE}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Registered Address
          </label>
          <textarea
            value={f.registeredAddress || FOOTER_CONTENT_DEFAULTS.registeredAddress}
            onChange={(e) => setFooter({ registeredAddress: e.target.value })}
            placeholder={"Sialkot, Punjab, Pakistan"}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 14,
              color: "#111827",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Trustpilot URL (optional)
          </label>
          <input
            type="text"
            value={f.trustpilotUrl || ""}
            onChange={(e) => setFooter({ trustpilotUrl: e.target.value })}
            placeholder="https://www.trustpilot.com/review/crazzycars.pk"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 14,
              color: "#111827",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
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
          Copyright Text
        </label>
        <input
          type="text"
          value={f.copyrightText || FOOTER_CONTENT_DEFAULTS.copyrightText}
          onChange={(e) => setFooter({ copyrightText: e.target.value })}
          placeholder={`© ${new Date().getFullYear()} Crazzycars.pk. All Rights Reserved.`}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 14,
            color: "#111827",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <p
          style={{
            fontSize: 11,
            color: "#9CA3AF",
            marginTop: 4,
          }}
        >
          Use {"{year}"} to auto-insert current year. Example: © {"{year}"} {g.storeName || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`}. All rights
          reserved.
        </p>
      </div>

      <section className="space-y-3">
        <h3 style={FOOTER_SECTION_TITLE}>Social media links</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {SOCIAL_KEYS.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={social[key] || ""}
              onChange={(v) => {
                const next = { ...social, [key]: key === "whatsapp" && /^\d+$/.test(v.trim()) ? `https://wa.me/${v.trim()}` : v };
                setFooter({ social: next });
              }}
              placeholder={key === "whatsapp" ? "923244220007 or https://wa.me/..." : "https://facebook.com/crazzycars"}
            />
          ))}
        </div>
      </section>

      <LinkManager title="Shop Links" links={shopLinks} setLinks={setShopLinks} />

      <LinkManager title="Customer Care Links" links={customerCareLinks} setLinks={setCustomerCareLinks} />

      <AutoFooterCategories />
      <LinkManager title="Categories Links (fallback)" links={categoriesLinks} setLinks={setCategoriesLinks} />


      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 4px" }}>Footer payment icons</h3>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
            Icons shown in the storefront footer come from Settings → Payments 🇵🇰 (COD, JazzCash, Easypaisa, banks).
          </p>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#111111", marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={f.showPaymentIcons !== false}
            onChange={(e) => setFooter({ showPaymentIcons: e.target.checked })}
          />
          Show payment icons in footer
        </label>
      </div>

      <section className="space-y-3">
        <h3 style={FOOTER_SECTION_TITLE}>App download links</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="App Store URL" value={appLinks.appStore || ""} onChange={(v) => setFooter({ appLinks: { ...appLinks, appStore: v } })} placeholder="https://apps.apple.com/..." />
          <Field label="Google Play URL" value={appLinks.playStore || ""} onChange={(v) => setFooter({ appLinks: { ...appLinks, playStore: v } })} placeholder="https://play.google.com/..." />
        </div>
      </section>

      <button type="button" onClick={handleSave} className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white">
        Save Footer Settings
      </button>
    </div>
  );
}
