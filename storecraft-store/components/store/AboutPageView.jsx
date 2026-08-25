import Link from "next/link";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";

const DEFAULT_HERO = {
  badge: "Our Story",
  title: "Pakistan's Car Accessories Store",
  subtitle: `At ${STORE}, we help drivers upgrade their ride with splitters, LED lighting, body kits, carbon fiber parts, and car care — delivered across Pakistan.`,
};

const DEFAULT_STORY = {
  badge: "Who We Are",
  title: "Built for Pakistani Car Enthusiasts",
  paragraph1: `${STORE} is based in Gujranwala, Pakistan, and focuses on exterior and lighting upgrades that fit real Pakistani driving conditions.`,
  paragraph2:
    "From bumper splitters and spoilers to LED headlights and body kits, we stock accessories chosen for fitment, finish, and everyday use.",
  paragraph3:
    "We serve customers nationwide with Cash on Delivery, clear product details, and support when you need help choosing the right part.",
};

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
    description: "Order with confidence and pay when your package arrives at your doorstep, anywhere in Pakistan.",
  },
  {
    icon: "🚚",
    title: "Nationwide Delivery",
    description:
      "Fast delivery to Lahore, Karachi, Islamabad, Gujranwala, and cities across Pakistan with tracking where available.",
  },
];

const DEFAULT_PROMISE = {
  title: `${STORE} Promise`,
  paragraph1:
    "We promise honest product descriptions, fair pricing, and accessories we would use on our own vehicles. Every item is checked before it ships.",
  paragraph2: `Your satisfaction and your car's comfort come first. That is the ${STORE} way.`,
};

const DEFAULT_FAQ = [
  {
    question: "Do you deliver across Pakistan?",
    answer:
      "Yes! We deliver to major cities and towns nationwide. Delivery times are typically 2–5 business days depending on your location.",
  },
  {
    question: "Can I pay with Cash on Delivery?",
    answer: "Yes — COD is available on eligible orders. Pay in cash when your order arrives at your doorstep.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We accept returns on unused items in original packaging within 30 days. Contact us if you receive a damaged or incorrect item.",
  },
];

function pick(obj, defaults) {
  if (!obj || typeof obj !== "object") return defaults;
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) out[key] = v;
  }
  return out;
}

export default function AboutPageView({ aboutPage }) {
  const about = aboutPage && typeof aboutPage === "object" ? aboutPage : {};
  const hero = pick(about.hero, DEFAULT_HERO);
  const story = pick(about.story, DEFAULT_STORY);
  const promise = pick(about.promise, DEFAULT_PROMISE);

  const stats =
    Array.isArray(about.stats) && about.stats.some((s) => s?.number || s?.label)
      ? about.stats.filter((s) => s?.number || s?.label)
      : [];

  const values =
    Array.isArray(about.values) && about.values.some((v) => v?.title || v?.description)
      ? about.values
          .filter((v) => v?.title || v?.description)
          .map((v) => ({
            icon: v.icon || "⭐",
            title: v.title || "",
            description: v.description || v.desc || "",
          }))
      : DEFAULT_VALUES;

  const faq =
    Array.isArray(about.faq) && about.faq.some((f) => f?.question)
      ? about.faq.filter((f) => f?.question)
      : DEFAULT_FAQ;

  return (
    <div className="about-page-view" style={{ background: "#FFFFFF", minHeight: "60vh" }}>
      <section
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          borderBottom: "1px solid #E5E5E5",
          padding: "28px 0 24px",
        }}
      >
        <div className="store-container" style={{ maxWidth: 900, textAlign: "center" }}>
          {hero.badge ? (
            <span
              className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "#FFF8E6", color: "#B45309" }}
            >
              {hero.badge}
            </span>
          ) : null}
          <h1
            className="font-heading font-bold leading-tight"
            style={{ color: "#111111", fontSize: "clamp(22px, 6vw, 48px)", margin: "12px 0 0" }}
          >
            {hero.title}
          </h1>
          {hero.subtitle ? (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 640,
                fontSize: 16,
                lineHeight: 1.7,
                color: "#6B7280",
              }}
            >
              {hero.subtitle}
            </p>
          ) : null}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/shop"
              className="inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "#C41E1E" }}
            >
              Shop Accessories
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold transition hover:bg-zinc-50"
              style={{ border: "1px solid #E5E5E5", color: "#111111" }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {stats.length > 0 ? (
        <section style={{ background: "#111111", padding: "36px 0" }}>
          <div
            className="store-container about-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 24,
              textAlign: "center",
            }}
          >
            {stats.map((stat, i) => (
              <div key={`${stat.number}-${stat.label}-${i}`}>
                <p className="font-heading text-3xl font-bold" style={{ color: "#FFFFFF", margin: 0 }}>
                  {stat.number}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9CA3AF" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ padding: "64px 0" }}>
        <div className="store-container" style={{ maxWidth: 720 }}>
          {story.badge ? (
            <span
              className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "#FFF8E6", color: "#B45309" }}
            >
              {story.badge}
            </span>
          ) : null}
          <h2 className="font-heading text-xl font-bold md:text-[32px]" style={{ color: "#111111", margin: "8px 0 0" }}>
            {story.title}
          </h2>
          <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 12, marginBottom: 24 }} />
          {[story.paragraph1, story.paragraph2, story.paragraph3]
            .filter((p) => String(p || "").trim())
            .map((p, i) => (
              <p key={i} style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.75, color: "#374151" }}>
                {p}
              </p>
            ))}
        </div>
      </section>

      {values.length > 0 ? (
        <section style={{ background: "#FAFAFA", padding: "64px 0", borderTop: "1px solid #E5E5E5" }}>
          <div className="store-container">
            <h2 className="font-heading text-xl font-bold md:text-[28px]" style={{ color: "#111111", margin: 0 }}>
              What We Stand For
            </h2>
            <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 10, marginBottom: 32 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 28,
              }}
            >
              {values.map((val, i) => (
                <div key={`${val.title}-${i}`}>
                  <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
                    {val.icon}
                  </span>
                  <h3
                    className="font-heading text-lg font-bold"
                    style={{ color: "#111111", margin: "10px 0 6px" }}
                  >
                    {val.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#6B7280" }}>
                    {val.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ padding: "64px 0" }}>
        <div className="store-container" style={{ maxWidth: 720 }}>
          <h2 className="font-heading text-xl font-bold md:text-[28px]" style={{ color: "#111111", margin: 0 }}>
            {promise.title}
          </h2>
          <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 10, marginBottom: 24 }} />
          {[promise.paragraph1, promise.paragraph2]
            .filter((p) => String(p || "").trim())
            .map((p, i) => (
              <p key={i} style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.75, color: "#374151" }}>
                {p}
              </p>
            ))}
        </div>
      </section>

      {faq.length > 0 ? (
        <section style={{ background: "#FAFAFA", padding: "64px 0", borderTop: "1px solid #E5E5E5" }}>
          <div className="store-container" style={{ maxWidth: 720 }}>
            <h2 className="font-heading text-xl font-bold md:text-[28px]" style={{ color: "#111111", margin: 0 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 10, marginBottom: 28 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {faq.map((item, i) => (
                <details
                  key={`${item.question}-${i}`}
                  style={{
                    borderBottom: "1px solid #E5E5E5",
                    paddingBottom: 12,
                  }}
                >
                  <summary
                    className="font-heading cursor-pointer list-none text-base font-semibold"
                    style={{ color: "#111111", padding: "8px 0" }}
                  >
                    {item.question}
                  </summary>
                  <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.7, color: "#6B7280" }}>
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
