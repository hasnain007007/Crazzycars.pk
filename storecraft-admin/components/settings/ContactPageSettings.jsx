"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

export default function ContactPageSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hero: {
      badge: "Get In Touch",
      title: "We Would Love to Hear From You",
      subtitle: "Questions about an order, product advice, or just want to say hello? We are always happy to help.",
    },
    email: "info@crazzycars.pk",
    phone: "+92 324 422 0007",
    whatsapp: "923244220007",
    address: {
      line1: "",
      line2: "",
      city: "Sialkot",
      country: "Pakistan",
    },
    hours: {
      weekdays: "Monday - Saturday: 9am - 9pm PKT",
      weekend: "Sunday: 10am - 6pm PKT",
      closed: "Sunday: Closed",
    },
    responseTime: "We reply to all emails within 24 hours",
    socialLinks: {
      instagram: "",
      facebook: "",
      tiktok: "",
      twitter: "",
    },
    faq: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", {
          credentials: "include",
        });
        const data = await res.json();
        const contact = data?.settings?.contactPage || data?.data?.contactPage;
        if (contact) {
          setForm((prev) => ({
            ...prev,
            ...contact,
            hero: { ...prev.hero, ...contact.hero },
            address: {
              ...prev.address,
              ...contact.address,
            },
            hours: { ...prev.hours, ...contact.hours },
            socialLinks: {
              ...prev.socialLinks,
              ...contact.socialLinks,
            },
            faq: contact.faq || [],
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactPage: form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Contact page updated!");
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const input = {
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

  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  const card = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  };

  const sectionTitle = {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
    paddingBottom: 12,
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>Contact Page Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Changes appear on the storefront immediately</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: "10px 24px",
            background: saving ? "#9ca3af" : "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>🎯 Hero Section</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Badge Text</label>
          <input
            style={input}
            placeholder="e.g. Get In Touch"
            value={form.hero?.badge || ""}
            onChange={(e) => setForm((f) => ({
              ...f,
              hero: { ...f.hero, badge: e.target.value },
            }))}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Page Title</label>
          <input
            style={input}
            placeholder="e.g. We Would Love to Hear From You"
            value={form.hero?.title || ""}
            onChange={(e) => setForm((f) => ({
              ...f,
              hero: { ...f.hero, title: e.target.value },
            }))}
          />
        </div>
        <div>
          <label style={label}>Subtitle</label>
          <textarea
            style={{
              ...input,
              minHeight: 80,
              resize: "vertical",
              lineHeight: 1.6,
            }}
            placeholder="Short description below title..."
            value={form.hero?.subtitle || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                hero: {
                  ...f.hero,
                  subtitle: e.target.value,
                },
              }))
            }
          />
        </div>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>📞 Contact Details</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={label}>Email Address *</label>
            <input
              style={input}
              type="email"
              placeholder="support@crazzycars.pk"
              value={form.email || ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                email: e.target.value,
              }))}
            />
          </div>
          <div>
            <label style={label}>Phone Number</label>
            <input
              style={input}
              type="tel"
              placeholder="+92 324 422 0007"
              value={form.phone || ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                phone: e.target.value,
              }))}
            />
          </div>
          <div>
            <label style={label}>WhatsApp Number</label>
            <input
              style={input}
              placeholder="923244220007"
              value={form.whatsapp || ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                whatsapp: e.target.value,
              }))}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Include country code</p>
          </div>
          <div>
            <label style={label}>Response Time</label>
            <input
              style={input}
              placeholder="We reply within 24 hours"
              value={form.responseTime || ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                responseTime: e.target.value,
              }))}
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>
          📍 Address
          <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>(optional — leave blank to hide)</span>
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={label}>Address Line 1</label>
            <input
              style={input}
              placeholder="Sialkot, Punjab, Pakistan"
              value={form.address?.line1 || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  address: {
                    ...f.address,
                    line1: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={label}>Address Line 2</label>
            <input
              style={input}
              placeholder="Suite 4B"
              value={form.address?.line2 || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  address: {
                    ...f.address,
                    line2: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={label}>City</label>
            <input
              style={input}
              placeholder="Sialkot"
              value={form.address?.city || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  address: {
                    ...f.address,
                    city: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={label}>Country</label>
            <input
              style={input}
              placeholder="Pakistan"
              value={form.address?.country || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  address: {
                    ...f.address,
                    country: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>🕐 Business Hours</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={label}>Weekdays</label>
            <input
              style={input}
              placeholder="Monday - Saturday: 9am - 9pm PKT"
              value={form.hours?.weekdays || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hours: {
                    ...f.hours,
                    weekdays: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={label}>Saturday</label>
            <input
              style={input}
              placeholder="Sunday: 10am - 6pm PKT"
              value={form.hours?.weekend || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hours: {
                    ...f.hours,
                    weekend: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={label}>Sunday</label>
            <input
              style={input}
              placeholder="Sunday: Closed"
              value={form.hours?.closed || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hours: {
                    ...f.hours,
                    closed: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>
          📱 Social Media Links
          <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>(full URLs)</span>
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {[
            { key: "instagram", label: "📸 Instagram", placeholder: "https://instagram.com/crazzycars" },
            { key: "facebook", label: "👥 Facebook", placeholder: "https://facebook.com/crazzycars" },
            { key: "tiktok", label: "🎵 TikTok", placeholder: "https://tiktok.com/@crazzycars" },
            { key: "twitter", label: "𝕏 Twitter / X", placeholder: "https://twitter.com/crazzycars" },
          ].map((s) => (
            <div key={s.key}>
              <label style={label}>{s.label}</label>
              <input
                style={input}
                type="url"
                placeholder={s.placeholder}
                value={form.socialLinks?.[s.key] || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    socialLinks: {
                      ...f.socialLinks,
                      [s.key]: e.target.value,
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <h3 style={{ ...sectionTitle, margin: 0, paddingBottom: 0, borderBottom: "none" }}>❓ FAQ Section</h3>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                faq: [...(f.faq || []), { question: "", answer: "" }],
              }))
            }
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
            + Add FAQ
          </button>
        </div>

        {(!form.faq || form.faq.length === 0) && (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No FAQs added yet. Click + Add FAQ to add one.</p>
        )}

        {(form.faq || []).map((item, i) => (
          <div
            key={i}
            style={{
              background: "#f9fafb",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>FAQ {i + 1}</span>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    faq: (f.faq || []).filter((_, idx) => idx !== i),
                  }))
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Question</label>
              <input
                style={input}
                placeholder="e.g. How long does shipping take?"
                value={item.question || ""}
                onChange={(e) => {
                  const faqs = [...form.faq];
                  faqs[i] = {
                    ...faqs[i],
                    question: e.target.value,
                  };
                  setForm((f) => ({ ...f, faq: faqs }));
                }}
              />
            </div>
            <div>
              <label style={label}>Answer</label>
              <textarea
                style={{
                  ...input,
                  minHeight: 80,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
                placeholder="Your answer here..."
                value={item.answer || ""}
                onChange={(e) => {
                  const faqs = [...form.faq];
                  faqs[i] = {
                    ...faqs[i],
                    answer: e.target.value,
                  };
                  setForm((f) => ({ ...f, faq: faqs }));
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
