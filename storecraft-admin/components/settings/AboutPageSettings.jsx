"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

const DEFAULT_STATS = [];

const DEFAULT_VALUES = [
  {
    icon: "🚗",
    title: "Premium Quality",
    description:
      "Every product is selected for durability, fit, and finish. We only stock accessories we would install on our own cars.",
  },
  {
    icon: "✨",
    title: "Clear Fitment Info",
    description:
      "Compatible makes and models are listed where available so you can order with confidence.",
  },
  {
    icon: "💳",
    title: "Cash on Delivery",
    description:
      "Order with confidence and pay when your package arrives at your doorstep, anywhere in Pakistan.",
  },
  {
    icon: "🚚",
    title: "Nationwide Delivery",
    description:
      "Fast delivery to Lahore, Karachi, Islamabad, and cities across Pakistan with tracking where available.",
  },
  {
    icon: "💬",
    title: "Expert Support",
    description:
      "Not sure which accessory fits your car? Our team helps you choose the right product for your make and model.",
  },
  {
    icon: "↩️",
    title: "Easy Returns",
    description: "We stand behind our products. If something is not right, contact us for a straightforward return or exchange.",
  },
];

const DEFAULT_FAQ = [
  {
    question: "Do you deliver across Pakistan?",
    answer:
      "Yes! We deliver to major cities and towns nationwide. Delivery times are typically 2–5 business days depending on your location. Free delivery may apply on qualifying order totals shown at checkout.",
  },
  {
    question: "Can I pay with Cash on Delivery?",
    answer:
      "Yes — COD is available on eligible orders. Pay in cash when your order arrives at your doorstep.",
  },
  {
    question: "How do I know if an accessory fits my car?",
    answer:
      "Each product listing includes compatible makes, models, and years where applicable. Contact us on WhatsApp if you need help choosing the right fit.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Orders across Pakistan typically arrive within 2–5 business days depending on your city. All shipped orders include tracking where available.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We accept returns on unused items in original packaging within 30 days. If you receive a damaged or incorrect item, contact support@crazzycars.pk and we will make it right.",
  },
  {
    question: "How can I track my order?",
    answer:
      "You will receive tracking details by SMS or email once your order ships. You can also view order status in your account.",
  },
];

const HERO_DEFAULT = {
  badge: "Our Story",
  title: "Fitment-first car accessories from Gujranwala",
  subtitle:
    `At ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}, we help drivers upgrade their ride with splitters, LED lighting, body kits, and car care essentials — delivered across Pakistan.`,
};

const STORY_DEFAULT = {
  badge: "Who We Are",
  title: "Built for Pakistani Car Enthusiasts",
  paragraph1:
    `${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} was founded in Gujranwala, Pakistan, by car enthusiasts who wanted premium accessories at fair prices — without compromising on quality.`,
  paragraph2:
    "From bumper splitters and spoilers to LED lights and body kits, every product is chosen for real-world use in Pakistani conditions — heat, dust, and daily driving.",
  paragraph3:
    "Today we serve customers from Lahore to Karachi and beyond, with Cash on Delivery, responsive support, and accessories that make every drive more comfortable and stylish.",
};

const PROMISE_DEFAULT = {
  title: `${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} Promise`,
  paragraph1:
    "We promise honest product descriptions, fair pricing, and accessories we would use on our own vehicles. Every item is checked before it ships.",
  paragraph2:
    `Your satisfaction and your car's comfort come first. That is the ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} way.`,
};

export default function AboutPageSettings() {
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  const [hero, setHero] = useState(HERO_DEFAULT);
  const [story, setStory] = useState(STORY_DEFAULT);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [promise, setPromise] = useState(PROMISE_DEFAULT);
  const [faq, setFaq] = useState(DEFAULT_FAQ);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const about = data?.settings?.aboutPage || data?.data?.aboutPage || data?.aboutPage;
        if (about) {
          if (about.hero) setHero({ ...HERO_DEFAULT, ...about.hero });
          if (about.story) setStory({ ...STORY_DEFAULT, ...about.story });
          if (about.stats?.length) setStats(about.stats);
          if (about.values?.length) setValues(about.values.map((v) => ({ ...v, description: v.description || v.desc || "" })));
          if (about.promise) setPromise({ ...PROMISE_DEFAULT, ...about.promise });
          if (about.faq?.length) setFaq(about.faq);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aboutPage: {
            hero,
            story,
            stats,
            values,
            promise,
            faq,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("About page updated!");
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch (e) {
      toast.error(`Save failed: ${e.message || "Network error"}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 100,
    resize: "vertical",
    lineHeight: 1.6,
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  };

  const sections = [
    { key: "hero", label: "🎯 Hero" },
    { key: "story", label: "📖 Our Story" },
    { key: "stats", label: "📊 Stats" },
    { key: "values", label: "💎 Values" },
    { key: "promise", label: "🤝 Promise" },
    { key: "faq", label: "❓ FAQ" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          padding: "16px 20px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>About Page Content</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Changes reflect on the storefront after cache refresh (about API caches ~1 min).</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: "8px 16px",
              border: "1px solid",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              borderColor: activeSection === s.key ? "#009688" : "#e5e7eb",
              background: activeSection === s.key ? "#009688" : "#fff",
              color: activeSection === s.key ? "#fff" : "#374151",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "hero" ? (
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            🎯 Hero Section
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Badge Text</label>
            <input
              style={inputStyle}
              placeholder="e.g. Our Story"
              value={hero.badge || ""}
              onChange={(e) => setHero((h) => ({ ...h, badge: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Main Headline *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Fitment-first car accessories from Gujranwala"
              value={hero.title || ""}
              onChange={(e) => setHero((h) => ({ ...h, title: e.target.value }))}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Use a line break in the text for a second line (optional).</p>
          </div>
          <div>
            <label style={labelStyle}>Subtitle</label>
            <textarea
              style={textareaStyle}
              placeholder="Short description below the headline..."
              value={hero.subtitle || ""}
              onChange={(e) => setHero((h) => ({ ...h, subtitle: e.target.value }))}
            />
          </div>
        </div>
      ) : null}

      {activeSection === "story" ? (
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            📖 Our Story Section
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Badge Text</label>
            <input
              style={inputStyle}
              placeholder="e.g. Who We Are"
              value={story.badge || ""}
              onChange={(e) => setStory((st) => ({ ...st, badge: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Section Title</label>
            <input
              style={inputStyle}
              placeholder="e.g. Built for Pakistani Car Enthusiasts"
              value={story.title || ""}
              onChange={(e) => setStory((st) => ({ ...st, title: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Paragraph 1</label>
            <textarea
              style={textareaStyle}
              placeholder="First paragraph of your story..."
              value={story.paragraph1 || ""}
              onChange={(e) => setStory((st) => ({ ...st, paragraph1: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Paragraph 2</label>
            <textarea
              style={textareaStyle}
              placeholder="Second paragraph..."
              value={story.paragraph2 || ""}
              onChange={(e) => setStory((st) => ({ ...st, paragraph2: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Paragraph 3</label>
            <textarea
              style={textareaStyle}
              placeholder="Third paragraph..."
              value={story.paragraph3 || ""}
              onChange={(e) => setStory((st) => ({ ...st, paragraph3: e.target.value }))}
            />
          </div>
        </div>
      ) : null}

      {activeSection === "stats" ? (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>📊 Stats Bar</h3>
            <button
              type="button"
              onClick={() => setStats((prev) => [...prev, { number: "0+", label: "New Stat" }])}
              style={{
                padding: "6px 14px",
                background: "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + Add Stat
            </button>
          </div>
          {stats.map((stat, i) => (
            <div
              key={`stat-${i}-${stat.label}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 12,
                marginBottom: 12,
                alignItems: "end",
              }}
            >
              <div>
                <label style={labelStyle}>Number</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 393+"
                  value={stat.number || ""}
                  onChange={(e) => {
                    const next = [...stats];
                    next[i] = { ...next[i], number: e.target.value };
                    setStats(next);
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Label</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Active products"
                  value={stat.label || ""}
                  onChange={(e) => {
                    const next = [...stats];
                    next[i] = { ...next[i], label: e.target.value };
                    setStats(next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setStats(stats.filter((_, idx) => idx !== i))}
                style={{
                  padding: "8px 12px",
                  background: "#fee2e2",
                  border: "none",
                  borderRadius: 6,
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0" }}>These numbers appear in the teal stats bar on the About page.</p>
        </div>
      ) : null}

      {activeSection === "values" ? (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>💎 Core Values Cards</h3>
            <button
              type="button"
              onClick={() =>
                setValues((prev) => [...prev, { icon: "⭐", title: "New Value", description: "Description here" }])
              }
              style={{
                padding: "6px 14px",
                background: "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + Add Value
            </button>
          </div>
          {values.map((val, i) => (
            <div
              key={`val-${i}-${val.title}`}
              style={{
                background: "#f9fafb",
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Value {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setValues(values.filter((_, idx) => idx !== i))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Remove
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label style={labelStyle}>Icon</label>
                  <input
                    style={inputStyle}
                    placeholder="🔬"
                    value={val.icon || ""}
                    onChange={(e) => {
                      const next = [...values];
                      next[i] = { ...next[i], icon: e.target.value };
                      setValues(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    style={inputStyle}
                    placeholder="Value title"
                    value={val.title || ""}
                    onChange={(e) => {
                      const next = [...values];
                      next[i] = { ...next[i], title: e.target.value };
                      setValues(next);
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: 70 }}
                  placeholder="Short description..."
                  value={val.description || ""}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = { ...next[i], description: e.target.value };
                    setValues(next);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeSection === "promise" ? (
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            🤝 Our Promise Section
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Section Title</label>
            <input
              style={inputStyle}
              placeholder={`e.g. ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} Promise`}
              value={promise.title || ""}
              onChange={(e) => setPromise((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Paragraph 1</label>
            <textarea
              style={textareaStyle}
              placeholder="First paragraph of your promise..."
              value={promise.paragraph1 || ""}
              onChange={(e) => setPromise((p) => ({ ...p, paragraph1: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Paragraph 2</label>
            <textarea
              style={textareaStyle}
              placeholder="Second paragraph..."
              value={promise.paragraph2 || ""}
              onChange={(e) => setPromise((p) => ({ ...p, paragraph2: e.target.value }))}
            />
          </div>
        </div>
      ) : null}

      {activeSection === "faq" ? (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>❓ FAQ Section</h3>
            <button
              type="button"
              onClick={() => setFaq((prev) => [...prev, { question: "New question?", answer: "Answer here..." }])}
              style={{
                padding: "6px 14px",
                background: "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + Add FAQ
            </button>
          </div>
          {faq.map((item, i) => (
            <div
              key={`faq-${i}-${item.question}`}
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
                  onClick={() => setFaq(faq.filter((_, idx) => idx !== i))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Remove
                </button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Question</label>
                <input
                  style={inputStyle}
                  placeholder="Question here?"
                  value={item.question || ""}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...next[i], question: e.target.value };
                    setFaq(next);
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Answer</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: 80 }}
                  placeholder="Answer here..."
                  value={item.answer || ""}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...next[i], answer: e.target.value };
                    setFaq(next);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
