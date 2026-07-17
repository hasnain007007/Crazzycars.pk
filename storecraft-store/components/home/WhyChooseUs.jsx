import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

const FALLBACK_ITEMS = DEFAULT_HOMEPAGE_SETTINGS.whyChooseUs;

export default function WhyChooseUs({ settings }) {
  const raw = settings?.whyChooseUs;
  const items = (Array.isArray(raw) ? raw : FALLBACK_ITEMS)
    .filter((item) => item.isActive !== false && (item.title || item.description))
    .slice(0, 8);

  return (
    <section className="homepage-section py-12 md:py-20" style={{ background: "#111111" }}>
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold" style={{ color: "#FFFFFF" }}>
          {settings?.sectionTitles?.whyChooseUs || "Why Choose Us"}
        </h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8, marginBottom: 24 }} />
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {(items.length ? items : FALLBACK_ITEMS).slice(0, 4).map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className="group relative rounded-xl border border-[#2a2a2a] bg-[#151515] p-6 text-center transition duration-200 hover:shadow-[0_0_20px_rgba(196,30,30,0.25)]"
            >
              <span className="text-[48px] leading-none" style={{ color: "#F5A623" }} aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-4 text-base font-bold" style={{ color: "#FFFFFF" }}>
                {item.title}
              </h3>
              <p className="mt-2 max-w-[220px] text-[13px] leading-relaxed" style={{ color: "#D1D5DB" }}>
                {item.description || "Premium service, fast support and trusted quality."}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm font-semibold" style={{ color: "#9CA3AF" }}>
          Trusted by 10,000+ Pakistani Drivers
        </p>
      </div>
    </section>
  );
}
