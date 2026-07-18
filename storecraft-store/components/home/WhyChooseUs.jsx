import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

export default function WhyChooseUs({ settings }) {
  const raw = settings?.whyChooseUs;
  const items = (Array.isArray(raw) && raw.length ? raw : DEFAULT_HOMEPAGE_SETTINGS.whyChooseUs)
    .filter((item) => item.isActive !== false && (item.title || item.description))
    .slice(0, 8);

  if (!items.length) return null;

  return (
    <section className="homepage-section hidden py-12 md:block md:py-20" style={{ background: "#111111" }}>
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold" style={{ color: "#FFFFFF" }}>
          {settings?.sectionTitles?.whyChooseUs || "Why Choose Us"}
        </h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8, marginBottom: 24 }} />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-10">
          {items.slice(0, 4).map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className="group relative flex flex-col items-center rounded-xl border border-[#2a2a2a] bg-[#151515] p-4 text-center transition duration-200 hover:shadow-[0_0_20px_rgba(196,30,30,0.25)] sm:p-6"
            >
              <span className="text-[36px] leading-none sm:text-[48px]" style={{ color: "#F5A623" }} aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-3 text-sm font-bold sm:mt-4 sm:text-base" style={{ color: "#FFFFFF" }}>
                {item.title}
              </h3>
              <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed sm:text-[13px]" style={{ color: "#D1D5DB" }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
