import Link from "next/link";
import { COD_LINE, PREPAID_LINE, TRUST_LINE } from "@/lib/paymentCopy";

const STORE = "CrazzyCars.pk";

const DEFAULT_HERO = {
  badge: "Our Story",
  title: "About CrazzyCars.pk – Car Accessories Shop in Gujranwala",
  subtitle: `${STORE} helps drivers upgrade their ride with splitters, LED lighting, body kits, carbon fiber parts, and car care — delivered across Pakistan.`,
};

const DEFAULT_STORY = {
  badge: "Who We Are",
  title: "Built for Pakistani Car Enthusiasts",
  paragraph1: `${TRUST_LINE}`,
  paragraph2:
    "From bumper splitters and spoilers to LED headlights and body kits, we stock accessories chosen for fitment, finish, and everyday use on Pakistani roads.",
  paragraph3: `${COD_LINE} on eligible items. Body kits are prepaid (${PREPAID_LINE}).`,
};

const DEFAULT_VALUES = [
  {
    icon: "✨",
    title: "Clear Fitment Info",
    description:
      "Compatible makes and models are listed where available so you can order with confidence.",
  },
  {
    icon: "💳",
    title: "Payment options",
    description: `${COD_LINE}. Body kits use prepaid JazzCash or bank transfer.`,
  },
  {
    icon: "🚚",
    title: "Nationwide Delivery",
    description:
      "Delivery to Lahore, Karachi, Islamabad, Gujranwala, and cities across Pakistan with tracking where available.",
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
      "Yes. We deliver nationwide. Delivery is Rs 250 for regular items, or Rs 500 for bulky items. Times vary by city.",
  },
  {
    question: "Can I pay with Cash on Delivery?",
    answer: `Yes, on eligible items. ${COD_LINE}. Body kits are prepaid.`,
  },
  {
    question: "What is your return policy?",
    answer: "7 days, defective or wrong item only. Change of mind is not eligible.",
  },
];

const BANNED_CLAIM_RE = /\b(genuine|oem|#\s*1|best)\b/i;
const BAD_RETURN_RE = /return or exchange|unused items|30 days|pay in cash when/i;
const BAD_DELIVERY_RE = /flat\s+rs\.?\s*250\s+on every order/i;

function scrubText(s) {
  const t = String(s || "");
  if (BANNED_CLAIM_RE.test(t) || BAD_RETURN_RE.test(t) || BAD_DELIVERY_RE.test(t)) return "";
  // Prefer CrazzyCars.pk spelling over bare "CrazzyCars"
  return t.replace(/\bCrazzyCars\b(?!\.pk)/g, "CrazzyCars.pk");
}

function pick(obj, defaults) {
  if (!obj || typeof obj !== "object") return { ...defaults };
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const v = scrubText(obj[key]);
    if (typeof defaults[key] === "string" && v.trim()) out[key] = v;
  }
  return out;
}

export default function AboutPageView({ aboutPage }) {
  const about = aboutPage && typeof aboutPage === "object" ? aboutPage : {};
  const hero = pick(about.hero, DEFAULT_HERO);
  // Canonical title — CMS may lag.
  hero.title = DEFAULT_HERO.title;
  const story = pick(about.story, DEFAULT_STORY);
  const promise = pick(about.promise, DEFAULT_PROMISE);

  const stats =
    Array.isArray(about.stats) && about.stats.some((s) => s?.number || s?.label)
      ? about.stats.filter((s) => s?.number || s?.label)
      : [];

  const valuesRaw =
    Array.isArray(about.values) && about.values.some((v) => v?.title || v?.description)
      ? about.values
      : DEFAULT_VALUES;
  const values = valuesRaw
    .map((v) => ({
      icon: v.icon || "⭐",
      title: scrubText(v.title || ""),
      description: scrubText(v.description || v.desc || ""),
    }))
    .filter((v) => v.title || v.description);

  const faqRaw =
    Array.isArray(about.faq) && about.faq.some((f) => f?.question) ? about.faq : DEFAULT_FAQ;
  const faq = faqRaw
    .map((f) => ({
      question: scrubText(f.question || ""),
      answer: scrubText(f.answer || ""),
    }))
    .filter((f) => f.question && f.answer);

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
        </div>
      </section>

      <section className="store-container" style={{ maxWidth: 900, padding: "40px 16px" }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{story.badge}</p>
        <h2 className="font-heading mt-2 text-2xl font-bold text-[#111111]">{story.title}</h2>
        {[story.paragraph1, story.paragraph2, story.paragraph3].filter(Boolean).map((p) => (
          <p key={p.slice(0, 40)} className="mt-4 text-[15px] leading-relaxed text-[#444444]">
            {p}
          </p>
        ))}

        {stats.length ? (
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={`${s.number}-${s.label}`} className="rounded-lg border border-[#E5E5E5] p-4 text-center">
                <div className="font-heading text-2xl font-bold text-[#111111]">{s.number}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {values.length ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-lg border border-[#E5E5E5] p-5">
                <div className="text-2xl" aria-hidden>
                  {v.icon}
                </div>
                <h3 className="font-heading mt-3 text-lg font-bold text-[#111111]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#555555]">{v.description}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-12 rounded-lg bg-[#FAFAFA] p-6">
          <h2 className="font-heading text-xl font-bold text-[#111111]">{promise.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#444444]">{promise.paragraph1}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#444444]">{promise.paragraph2}</p>
        </div>

        {faq.length ? (
          <div className="mt-12">
            <h2 className="font-heading text-xl font-bold text-[#111111]">FAQ</h2>
            <dl className="mt-4 space-y-4">
              {faq.map((f) => (
                <div key={f.question}>
                  <dt className="font-semibold text-[#111111]">{f.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#555555]">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <p className="mt-10 text-sm text-[#6B7280]">
          Questions?{" "}
          <Link href="/contact" className="font-semibold text-[#C41E1E] underline">
            Contact us
          </Link>{" "}
          or WhatsApp 03284010007.
        </p>
      </section>
    </div>
  );
}
